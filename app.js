const video = document.getElementById('video');
const button = document.getElementById('button');
const select = document.getElementById('select');

const videoCanvas = document.getElementById('videoCanvas');
const videoCanvasCtx = videoCanvas.getContext("2d", { willReadFrequently: true });

const roiCanvas = document.getElementById('roiCanvas');
const roiCanvasCtx = roiCanvas.getContext("2d", { willReadFrequently: true });


let roiCanvasArr = ['1'].map(i => {
  const roiXCanvas = document.getElementById('roi'+i+'Canvas');
  const roiXCanvasCtx = roiXCanvas.getContext("2d", { willReadFrequently: true });

  const maskXCanvas = document.getElementById('mask'+i+'Canvas');
  const maskXCanvasCtx = maskXCanvas.getContext("2d");

  const pclinesXCanvas = document.getElementById('pclines'+i+'Canvas');
  const pclinesXCanvasCtx = maskXCanvas.getContext("2d");


  return {
    roiCanvas: roiXCanvas,
    roiCanvasCtx: roiXCanvasCtx,
    
    maskCanvas: maskXCanvas,
    maskCanvasCtx: maskXCanvasCtx,
    
    pclinesCanvas: pclinesXCanvas,
    pclinesCanvasCtx: pclinesXCanvasCtx,
  }
})

let currentStream;

function stopMediaTracks(stream) {
  stream.getTracks().forEach(track => {
    track.stop();
  });
};

let gmContextCount = 0

const context = { line: new gm.Line() }

video.addEventListener("play", () => {
  videoCanvas.width = video.videoWidth;
  videoCanvas.height = video.videoHeight;

  roiCanvas.width = video.videoWidth;
  roiCanvas.height = video.videoHeight;

  state.roiConfSel = state.confs[0]


  const draw = () => {    
    roiCanvasCtx.clearRect(0, 0, roiCanvas.width, roiCanvas.height)
    
    
    state.confs.forEach((conf, i) => {
      
      if (i === 0) {
        roiCanvasCtx.fillStyle = "rgba(255, 0, 0, 0.3)";
      } else {
        roiCanvasCtx.fillStyle = "rgba(0, 0, 255, 0.3)";
      }

      // Crop desired region from first canvas
      var imageData1 = videoCanvasCtx.getImageData(...conf.region);

      roiCanvasCtx.fillRect(...conf.region);
      videoCanvasCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

      roiCanvasArr[i].roiCanvasCtx.putImageData(imageData1, 0, 0);
      
      roiCanvasArr[i].roiCanvas.width = imageData1.width;
      roiCanvasArr[i].roiCanvas.height = imageData1.height;
      
      let uint8array = Uint8Array.from(imageData1.data)

      const sess = new gm.Session();
      
      const t = new gm.Tensor('uint8', [roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width, 4], uint8array);
      
      let pipeline = t

      let hasPcLines = conf.pipeline.filter(c => c[0] && c[1] === 'pcLines').length
      
      let output
      let canvasProcessed
      
      let lines = [];
      const maxP = Math.max(t.shape[0], t.shape[1]);

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



      gmContextCount += 1;
      sess.destroy()

      // console.log(lines)
      
      let upsampleFactor = 1
      let upsampleConf = conf.pipeline.filter(c => c[1] === 'upsample')[0]
      if (upsampleConf) upsampleFactor = upsampleConf[2]

      for (let m = 0; m < lines.length; m += 1) {
        // console.log(lines[m])
        context.line.fromParallelCoords(
          lines[m][1] / upsampleFactor, lines[m][2] / upsampleFactor,
          t.shape[1], t.shape[0], maxP, maxP / 2,
        );
        // console.log(context.line)
        gm.canvasDrawLine(roiCanvasArr[i].roiCanvas, context.line, 'rgba(0, 255, 0, 1.0)')
      }

      if (state.showpp) {
        roiCanvasCtx.drawImage(roiCanvasArr[i].roiCanvas, conf.region[0], conf.region[1], conf.region[2], conf.region[3])


      }
      
      roiCanvasCtx.drawImage(roiCanvasArr[i].maskCanvas, conf.region[0], conf.region[1], conf.region[2], conf.region[3])

    })

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

button.addEventListener('click', event => {
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
