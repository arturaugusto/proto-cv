
const video = document.getElementById('video');
const select = document.getElementById('select');

const videoCanvas = document.getElementById('videoCanvas');
const videoCanvasCtx = videoCanvas.getContext("2d", { willReadFrequently: true });

const roiCanvas = document.getElementById('roiCanvas');
const roiCanvasCtx = roiCanvas.getContext("2d", { willReadFrequently: true });


let roiCanvasArr = '1,2,3,4,5,6'.split(',').map(i => {
  const roiXCanvas = document.getElementById('roi'+i+'Canvas');
  const roiXCanvasCtx = roiXCanvas.getContext("2d", { willReadFrequently: true });


  return {
    roiCanvas: roiXCanvas,
    roiCanvasCtx: roiXCanvasCtx,    
  }
})

let currentStream;

function stopMediaTracks(stream) {
  stream.getTracks().forEach(track => {
    track.stop();
  });
};


function playTone(frequency, duration) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = frequency;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();

  // Calculate the fade-out duration (20% of the total duration)
  const fadeOutDuration = duration * 0.05;

  // Schedule the fade-out effect
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + (duration / 1000) - (fadeOutDuration / 1000));

  // Stop the oscillator after the specified duration
  setTimeout(function() {
    oscillator.stop();
    audioContext.close();
  }, duration);
}



let gmContextCount = 0

const context = { line: new gm.Line() }

let POSTPROCESS_STATE = {}

video.addEventListener("play", () => {
  videoCanvas.width = video.videoWidth;
  videoCanvas.height = video.videoHeight;

  roiCanvas.width = video.videoWidth;
  roiCanvas.height = video.videoHeight;


  const draw = () => {    
    roiCanvasCtx.clearRect(0, 0, roiCanvas.width, roiCanvas.height)
    
    state.confs.forEach((conf, i) => {
      // Crop desired region from first canvas
      var imageData1 = videoCanvasCtx.getImageData(...conf.region.map(parseFloat));
      // roiCanvasCtx.fillRect(...conf.region);
      roiCanvasCtx.strokeStyle = COLORS[i]
      roiCanvasCtx.lineWidth = 2
      roiCanvasCtx.strokeRect(parseFloat(conf.region[0])-1, parseFloat(conf.region[1])-1, parseFloat(conf.region[2])+2, parseFloat(conf.region[3])+2)

      videoCanvasCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

      roiCanvasArr[i].roiCanvasCtx.putImageData(imageData1, 0, 0);
      
      roiCanvasArr[i].roiCanvas.width = imageData1.width;
      roiCanvasArr[i].roiCanvas.height = imageData1.height;
      
      

      if (conf.pipeline.filter(p => p[0] && p[1] !== 'ocr').length) {
        let uint8array = Uint8Array.from(imageData1.data)
        const sess = new gm.Session();


        const cropOpKernel = `
        vec4 operation(float y, float x) {
          return pickValue_tSrc(y + float(CY), x + float(CX));
        }
        `;

        const cropOp = (tSrc, x, y, w, h) => new gm.RegisterOperation('crop')
          .Input('tSrc', tSrc.dtype)
          .Output(tSrc.dtype)
          .Constant('CX', x)
          .Constant('CY', y)
          .LoadChunk('pickValue')
          .GLSLKernel(cropOpKernel)
          .SetShapeFn(() => [h, w, 4])
          .Compile({ tSrc });




        const t = new gm.Tensor('uint8', [roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width, 4], uint8array);
        
        let pipeline = t

        let pcLinesOps = conf.pipeline.filter(c => c[0] && c[1] === 'pcLines')
        let hasPcLines = pcLinesOps.length
        
        let output
        let canvasProcessed
        
        let lines = [];
        
        conf.pipeline.filter(c => c[1] !== 'ocr').forEach(c => {
          if (c[0]) {
            let opName = c[1].split('_')[0]

            if (opName === 'fft') {
              output = gm.tensorFrom(pipeline);
              sess.init(pipeline);
              sess.runOp(pipeline, gmContextCount, output);

              // output = gm.tensorFrom(pipeline)
              let imageDataFft = gm.toImageData(output, true)


              let arrayPreFft = pipeline.dtype === 'float32' ? Float32Array.from(imageDataFft.data) : Uint8Array.from(imageDataFft.data)

              let sizes = new Array(30).fill().map((_, i) => Math.pow(2,i))
              let inputSize = arrayPreFft.length/4
              
              let fftInputData = []
              
              // take power of 2 input
              for (let s = 0; s < sizes.length; s++) {
                if (sizes[s] >= inputSize) {
                  for (let i = 0; i < sizes[s]*2; i += 4) {
                    fftInputData.push(arrayPreFft[i])
                  }
                  break
                }
              }
              // console.log(fftInputData.length)


              let f = new FFTJS(fftInputData.length)
              let fftOut = f.createComplexArray()
              f.realTransform(fftOut, fftInputData)
              f.completeSpectrum(fftOut)

              fftOut = fftOut.slice(0, fftOut.length/2)

              fftOut = fftOut.map(x => Math.log10(100+(Math.abs(x)*c[2])))
              // fftOut = fftOut.map(x => Math.log10(1+(Math.abs(x*x)*c[2])))
              let fftOutMax = Math.max(...fftOut)
              fftOut = fftOut.map(x => (x/fftOutMax)*255)
              
              
              for (let i = 0; i < arrayPreFft.length; i += 4) {
                arrayPreFft[i] =   fftOut[Math.floor(i/4)]
                arrayPreFft[i+1] = fftOut[Math.floor(i/4)]
                arrayPreFft[i+2] = fftOut[Math.floor(i/4)]
                arrayPreFft[i+3] = 255
              }

              // console.log(arrayPreFft.length, fftOut.length)

              let darkTensor = new gm.Tensor(pipeline.dtype, [roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width, 4])
              darkTensor.data.fill(0)
              pipeline = gm.mult(darkTensor, pipeline)
              
              let fftTensor = new gm.Tensor(pipeline.dtype, [roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width, 4], arrayPreFft)
              pipeline = gm.add(fftTensor, pipeline)

            } else if (opName === 'invert') {
              let whiteTensor = new gm.Tensor(pipeline.dtype, [...pipeline.shape])
              whiteTensor.data.fill(255)
              pipeline = gm.sub(whiteTensor, pipeline)
            } else if (opName === 'dilate' || opName === 'erode') {
              pipeline = gm[opName](pipeline, [...c.slice(2).map(parseFloat)])
            } else {
              if (opName === 'pcLines') {
                // allocate output tensor
                output = gm.tensorFrom(pipeline)
                sess.init(pipeline)
                // run your operation
                sess.runOp(pipeline, gmContextCount, output);
                canvasProcessed = gm.canvasCreate(roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width)
                gm.canvasFromTensor(canvasProcessed, output)

                let imageData2 = gm.toImageData(output, true);
                roiCanvasArr[i].roiCanvasCtx.putImageData(imageData2, 0, 0)

                // https://github.com/PeculiarVentures/GammaCV/blob/master/app/sources/examples/pc_lines.js
                pipeline = gm[opName](pipeline, ...c.slice(2).map(parseFloat))

                output = gm.tensorFrom(pipeline);
                sess.init(pipeline);
                // run your operation
                sess.runOp(pipeline, gmContextCount, output);

                
                for (let m = 0; m < output.size / 4; m += 1) {
                  const y = ~~(m / output.shape[1]);
                  const x = m - (y * output.shape[1])
                  const value = output.get(y, x, 0)
                  const x0 = output.get(y, x, 1)
                  const y0 = output.get(y, x, 2)

                  if (value > 0.0) {
                    lines.push([value, x0, y0]);
                  }
                }

                lines = lines.sort((b, a) => a[0] - b[0]);
                let nLines = c[5]
                lines = lines.slice(0, nLines);
                conf.lines = lines
              } else {
                pipeline = gm[opName](pipeline, ...c.slice(2))
                
                if (opName === 'upsample') {
                  // crop upsampled region
                  pipeline = cropOp(pipeline, 0, 0, Math.round(pipeline.shape[1]/c[2]), Math.round(pipeline.shape[0]/c[2]));
                }
              }
            }
          }
        })



        // hide if pcLInes...
        if (!hasPcLines) {
          output = gm.tensorFrom(pipeline);
          sess.init(pipeline);
          sess.runOp(pipeline, gmContextCount, output);
          canvasProcessed = gm.canvasCreate(roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width);
          gm.canvasFromTensor(canvasProcessed, output)

          let imageData2 = gm.toImageData(output, true)
          roiCanvasArr[i].roiCanvasCtx.putImageData(imageData2, 0, 0)
        }


        // show pclines?
        const maxP = Math.max(t.shape[0], t.shape[1]);


        // console.log(lines)
        delete conf.lines
        if (pcLinesOps[0] && pcLinesOps[0][6]) {
          conf.lines = []
          for (let m = 0; m < lines.length; m += 1) {
            context.line.fromParallelCoords(
              lines[m][1] / 1,
              lines[m][2] / 1,
              t.shape[1], t.shape[0], maxP, maxP / 2,
            );
            gm.canvasDrawLine(roiCanvasArr[i].roiCanvas, context.line, 'rgba(0, 255, 0, 1.0)')
            // console.log(lines[m][1], lines[m][2], t.shape[1], maxP)
            let line = {}
            ;['angle', 'x1', 'x2', 'y1', 'y2', 'px', 'py'].forEach(item => {
              line[item] = context.line[item]
            })
            // see https://github.com/PeculiarVentures/GammaCV/issues/120
            // and https://codepen.io/WorldThirteen/pen/NWpVrMb to handle line intersection

            conf.lines.push(line)
          }
        }

        gmContextCount += 1;
        sess.destroy()
      }




      // function drawCircleOnRegion(canvas, x, y, radius) {
      //   var ctx = canvas.getContext("2d");
      //   var imageData = ctx.getImageData(x, y, radius * 2, radius * 2);
      //   var data = imageData.data;

      //   var centerX = radius;
      //   var centerY = radius;

      //   for (var i = 0; i < radius * 2; i++) {
      //     for (var j = 0; j < radius * 2; j++) {
      //       var dx = i - centerX;
      //       var dy = j - centerY;
      //       var distance = Math.sqrt(dx * dx + dy * dy);

      //       if (distance <= radius) {
      //         var pixelIndex = (j * radius * 2 + i) * 4;
      //         data[pixelIndex] = 255;     // Red channel
      //         data[pixelIndex + 1] = 0;   // Green channel
      //         data[pixelIndex + 2] = 0;   // Blue channel
      //         data[pixelIndex + 3] = 255; // Alpha channel (255 for opaque)
      //       }
      //     }
      //   }

      //   ctx.putImageData(imageData, x, y);
      // }
      // drawCircleOnRegion(roiCanvasArr[i].roiCanvas, 150, 150, 50)

      function drawRectangleOnCanvas(canvas, t, x, y, width, height) {
        // Get the 2D rendering context of the canvas
        var ctx = canvas.getContext('2d');

        // Get the pixel data from the rectangular region
        var imageData = ctx.getImageData(x, y, width, height);
        var data = imageData.data;

        let pixelOnCount = 0
        for (var i = 0; i < data.length; i += 4) {
          if (data[i] || data[i + 1] || data[i + 2]) {
            pixelOnCount += 1
          }
        }

        let detectRatio = pixelOnCount/(width*height)

        // for (var i = 0; i < data.length; i += 4) {
        //   data[i] = 255; // red channel
        //   // data[i + 1] = 0; // green channel
        //   // data[i + 2] = 0; // blue channel
        //   data[i + 3] = 100; // alpha channel
        // }

        // Draw a red rectangle on the specified region
        t.statePrev = t.state
        if (detectRatio >= t.histOn && !t.state) {
          t.state = true
          // console.log(detectRatio)
          // console.log(pixelOnCount, width, height)
        }

        if (detectRatio < t.histOff && t.state) {
          t.state = false
          // console.log(detectRatio)
          // console.log(pixelOnCount, width, height)
        }


        ctx.strokeStyle = t.state ? 'green' : 'red';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Put the modified pixel data back onto the canvas
        ctx.putImageData(imageData, x, y);

      }

      conf.trigRects.forEach(t => {
        drawRectangleOnCanvas(roiCanvasArr[i].roiCanvas, t, ...t.roi)
      })


      if (conf.showpp) {
        roiCanvasCtx.drawImage(roiCanvasArr[i].roiCanvas, conf.region[0], conf.region[1], conf.region[2], conf.region[3])
      }
      
    })

    
    try {
      let postProcFun = new Function('regions', 'state', 'ctx', myCodeMirror.getValue());
      postProcFun(state.confs, POSTPROCESS_STATE, roiCanvasCtx)
    } 
    catch (ex) {
      console.error("Error execution postprocessing:", ex.message)
    }

    if (!OCR_WORKING) {
      OCR_WORKING = true
      Promise.all(state.confs.map((conf, conf_i) => {
        let region = {
          left: conf.region[0],
          top: conf.region[1],
          width: conf.region[2],
          height: conf.region[3],
        }

        if (TESS_WORKERS[conf_i]) {
          return TESS_WORKERS[conf_i].recognize(roiCanvasArr[conf_i].roiCanvas, {region})
        }
        return new Promise((resolve) => resolve(null))
      }))
      .then(results => {
        results.forEach((result, result_i) => {
          if (result) {
            state.confs[result_i].ocrData = result.data
            state.confs[result_i].ocrData.t = Date.now()
          }
        })
      })
      .catch(err => {
        console.error("Error execution ocr:", err)
      })
      .finally(() => {
        OCR_WORKING = false
      })
      requestAnimationFrame(draw);
    } else {
      window.setTimeout(() => {
        requestAnimationFrame(draw);
      }, 25)
    }
    

  };
  requestAnimationFrame(draw);  
});
      


function gotDevices(mediaDevices) {
  select.innerHTML = '';
  select.appendChild(document.createElement('option'));
  let count = 1;
  mediaDevices.forEach(mediaDevice => {
    if (mediaDevice.kind === 'videoinput') {
      const option = document.createElement('option');
      option.value = mediaDevice.deviceId;
      const label = mediaDevice.label || `Camera ${count++}`;
      const textNode = document.createTextNode(label);
      option.appendChild(textNode);
      select.appendChild(option);
    }
  });

}

select.addEventListener('change', event => {
  if (typeof currentStream !== 'undefined') {
    stopMediaTracks(currentStream);
  }
  const videoConstraints = {};
  if (select.value === '') {
    videoConstraints.facingMode = 'environment';
  } else {
    videoConstraints.deviceId = { exact: select.value };
  }
  const constraints = {
    video: videoConstraints,
    audio: false
  };
  navigator.mediaDevices
  .getUserMedia(constraints)
  .then(stream => {
    currentStream = stream;
    video.srcObject = stream;
    return navigator.mediaDevices.enumerateDevices();
  })
  .then(gotDevices)
  .catch(error => {
    console.error(error);
  });
});


navigator.mediaDevices.enumerateDevices().then(gotDevices);
