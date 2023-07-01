const video = document.getElementById('video');
const select = document.getElementById('select');

const videoCanvas = document.getElementById('videoCanvas');
const videoCanvasCtx = videoCanvas.getContext("2d", { willReadFrequently: true });

const roiCanvas = document.getElementById('roiCanvas');
const roiCanvasCtx = roiCanvas.getContext("2d", { willReadFrequently: true });


let roiCanvasArr = '1,2,3,4,5,6'.split(',').map(i => {
  const roiXCanvas = document.getElementById('roi'+i+'Canvas');
  const roiXCanvasCtx = roiXCanvas.getContext("2d", { willReadFrequently: true });

  const maskXCanvas = document.getElementById('mask'+i+'Canvas');
  const maskXCanvasCtx = maskXCanvas.getContext("2d");


  return {
    roiCanvas: roiXCanvas,
    roiCanvasCtx: roiXCanvasCtx,
    
    maskCanvas: maskXCanvas,
    maskCanvasCtx: maskXCanvasCtx,
  }
})

let currentStream;

function stopMediaTracks(stream) {
  stream.getTracks().forEach(track => {
    track.stop();
  });
};

var myCodeMirror = CodeMirror(document.getElementById('code'), {
  value: "console.log(1);\n",
  mode:  "javascript",
  theme: 'monokai',
});

myCodeMirror.setSize('90vw', '200px')
console.log(myCodeMirror)


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

video.addEventListener("play", () => {
  videoCanvas.width = video.videoWidth;
  videoCanvas.height = video.videoHeight;

  roiCanvas.width = video.videoWidth;
  roiCanvas.height = video.videoHeight;


  const draw = () => {    
    roiCanvasCtx.clearRect(0, 0, roiCanvas.width, roiCanvas.height)
    
    
    state.confs.forEach((conf, i) => {
      // Crop desired region from first canvas
      var imageData1 = videoCanvasCtx.getImageData(...conf.region);
      // roiCanvasCtx.fillRect(...conf.region);
      roiCanvasCtx.strokeStyle = COLORS[i]
      roiCanvasCtx.lineWidth = 2
      roiCanvasCtx.strokeRect(conf.region[0]-1, conf.region[1]-1, conf.region[2]+2, conf.region[3]+2)



      videoCanvasCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

      roiCanvasArr[i].roiCanvasCtx.putImageData(imageData1, 0, 0);
      
      roiCanvasArr[i].roiCanvas.width = imageData1.width;
      roiCanvasArr[i].roiCanvas.height = imageData1.height;
      
      

      if (conf.pipeline.filter(p => p[0]).length) {
        let uint8array = Uint8Array.from(imageData1.data)

        const sess = new gm.Session();
        
        const t = new gm.Tensor('uint8', [roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width, 4], uint8array);
        
        let pipeline = t

        let hasPcLines = conf.pipeline.filter(c => c[0] && c[1] === 'pcLines').length
        
        let output
        let canvasProcessed
        
        let lines = [];

        conf.pipeline.forEach(c => {
          if (c[0]) {
            if (c[1] === 'dilate' || c[1] === 'erode') {
              pipeline = gm[c[1]](pipeline, [...c.slice(2)])
            } else {
              if (c[1] === 'pcLines') {
                // allocate output tensor
                output = gm.tensorFrom(pipeline);
                sess.init(pipeline);
                // run your operation
                sess.runOp(pipeline, gmContextCount, output);
                canvasProcessed = gm.canvasCreate(roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width);
                gm.canvasFromTensor(canvasProcessed, output)

                
                let imageData2 = gm.toImageData(output, true);
                roiCanvasArr[i].maskCanvas.width = imageData2.width;
                roiCanvasArr[i].maskCanvas.height = imageData2.height;
                roiCanvasArr[i].roiCanvasCtx.putImageData(imageData2, 0, 0);


                pipeline = gm[c[1]](pipeline, ...c.slice(2))

                
                output = gm.tensorFrom(pipeline);
                sess.init(pipeline);
                // run your operation
                sess.runOp(pipeline, gmContextCount, output);

                
                for (let m = 0; m < output.size / 4; m += 1) {
                  const y = ~~(m / output.shape[1]);
                  const x = m - (y * output.shape[1]);
                  const value = output.get(y, x, 0);
                  const x0 = output.get(y, x, 1);
                  const y0 = output.get(y, x, 2);

                  if (value > 0.0) {
                    lines.push([value, x0, y0]);
                  }
                }

                lines = lines.sort((b, a) => a[0] - b[0]);
                // console.log(lines)
                let nLines = conf.pipeline.filter(c => c[1] === 'pcLines')[0][5]
                // console.log(nLines)
                lines = lines.slice(0, nLines);

              } else {
                pipeline = gm[c[1]](pipeline, ...c.slice(2))
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
          roiCanvasArr[i].maskCanvas.width = imageData2.width
          roiCanvasArr[i].maskCanvas.height = imageData2.height
          roiCanvasArr[i].roiCanvasCtx.putImageData(imageData2, 0, 0)
        }


        const maxP = Math.max(t.shape[0], t.shape[1]);

        gmContextCount += 1;
        sess.destroy()

        // console.log(lines)
        
        let upsampleFactor = 1
        let upsampleConf = conf.pipeline.filter(c => c[0] && c[1] === 'upsample')[0]
        if (upsampleConf) upsampleFactor = upsampleConf[2]

        // console.log(upsampleFactor)
        // TODO: not working with pclines+upsample
        for (let m = 0; m < lines.length; m += 1) {
          context.line.fromParallelCoords(
            lines[m][1] / upsampleFactor,
            lines[m][2] / upsampleFactor,
            t.shape[1], t.shape[0], maxP, maxP / 2,
          );
          // console.log(context.line)
          gm.canvasDrawLine(roiCanvasArr[i].roiCanvas, context.line, 'rgba(0, 255, 0, 1.0)')
          conf.lines = lines
        }
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
        if (detectRatio >= t.histOn && !t.state) {
          t.state = true
          // console.log(detectRatio)
          // console.log(pixelOnCount, width, height)
        }

        if (detectRatio < t.histOff && t.state) {
          t.state = false
          console.log(t.state)
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
      
      roiCanvasCtx.drawImage(roiCanvasArr[i].maskCanvas, conf.region[0], conf.region[1], conf.region[2], conf.region[3])

    })

    
    try {
      let postProcFun = new Function('data', myCodeMirror.getValue());
      postProcFun(state.confs)
    } 
    catch (ex) {
      console.error("outer", ex.message)
    }

    requestAnimationFrame(draw);
    // window.setTimeout(() => {
    // }, 10)
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
