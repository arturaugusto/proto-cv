// INPUT



const setRoiCanvasSel = (canvas, ctx) => {
  // Variables to store the region of interest
  var startX, startY, endX, endY;
  var isDrawing = false;

  // Add event listeners for mouse events
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  // Handle the mouse down event
  function handleMouseDown(event) {
    startX = event.clientX - canvas.offsetLeft;
    startY = event.clientY - canvas.offsetTop;
    isDrawing = true;
  }

  // Handle the mouse move event
  function handleMouseMove(event) {
    if (!isDrawing) return;

    endX = event.clientX - canvas.offsetLeft;
    endY = event.clientY - canvas.offsetTop;


    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the region of interest
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    console.log(startX, startY, endX - startX, endY - startY)
  }

  // Handle the mouse up event
  function handleMouseUp() {
    isDrawing = false;

    // Perform actions with the region of interest
    var roiWidth = endX - startX;
    var roiHeight = endY - startY;
    console.log('Region of Interest:', startX, startY, roiWidth, roiHeight);
  }
}

setRoiCanvasSel(roiCanvas, roiCanvasCtx)





document.onkeydown = function(e) {
  return
  // console.log(e.keyCode)
  switch (e.keyCode) {
    case 65:
      state.roiConfSel = state.confs[0];
      break;
    case 66:
      state.roiConfSel = state.confs[1];
      break;    
  }
  
  if (!state.roiConfSel) return
  

  // console.log(e.keyCode)
  
  switch (e.keyCode) {
    
    case 84:
      state.showpp = !state.showpp
      e.preventDefault();
      break;

    case 37:

      if (state.roiConfSel.hTarget) {
        state.roiConfSel.hTarget = null
        state.roiConfSel.vTarget = 'a'
        e.preventDefault();
        break;
      }

      if (state.roiConfSel.vTarget === 'a') {
        if (state.roiConfSel.region[0] > 0) {
          state.roiConfSel.region[0] = Math.max(state.roiConfSel.region[0]-1, 0)
          state.roiConfSel.region[2] = Math.min(state.roiConfSel.region[2]+1, roiCanvas.width)
        }
      }

      if (state.roiConfSel.vTarget === 'd') {
        if (state.roiConfSel.region[2] > 1) {
          state.roiConfSel.region[2] = Math.min(state.roiConfSel.region[2]-1, roiCanvas.width)
        }
      }

      e.preventDefault();
      break;
    case 38:
      // console.log('up');

      if (state.roiConfSel.vTarget) {
        state.roiConfSel.vTarget = null
        state.roiConfSel.hTarget = 'w'
        e.preventDefault();
        break;
      }

      if (state.roiConfSel.hTarget === 'w') {
        if (state.roiConfSel.region[1] > 0) {
        state.roiConfSel.region[1] = Math.max(state.roiConfSel.region[1]-1, 0)
        state.roiConfSel.region[3] = Math.min(state.roiConfSel.region[3]+1, roiCanvas.height)
        }
      }

      if (state.roiConfSel.hTarget === 's') {
        if (state.roiConfSel.region[3] > 1) {
        state.roiConfSel.region[3] = Math.min(state.roiConfSel.region[3]-1, roiCanvas.height)
        }            
      }
      e.preventDefault();
      break;
    case 39:
      // console.log('right');

      if (state.roiConfSel.hTarget) {
      state.roiConfSel.hTarget = null
      state.roiConfSel.vTarget = 'd'
      e.preventDefault();
      break;
      }


      if (state.roiConfSel.vTarget === 'a') {
      if (state.roiConfSel.region[2] > 1) {
        state.roiConfSel.region[0] += 1
        state.roiConfSel.region[2] -= 1
      }
      }

      if (state.roiConfSel.vTarget === 'd') {
      if (state.roiConfSel.region[0]+state.roiConfSel.region[2] < roiCanvas.width) {
        state.roiConfSel.region[2] = Math.min(state.roiConfSel.region[2]+1, roiCanvas.width)
      }            
      }

      e.preventDefault();
      break;
    case 40:
      // console.log('down');
      if (state.roiConfSel.vTarget) {
        state.roiConfSel.vTarget = null
        state.roiConfSel.hTarget = 's'
        e.preventDefault();
        break;
      }


      if (state.roiConfSel.hTarget === 'w') {
        if (state.roiConfSel.region[3] > 1) {
        state.roiConfSel.region[1] += 1
        state.roiConfSel.region[3] -= 1
        }
      }

      if (state.roiConfSel.hTarget === 's') {
        if (state.roiConfSel.region[1]+state.roiConfSel.region[3] < roiCanvas.height) {
        state.roiConfSel.region[3] = Math.min(state.roiConfSel.region[3]+1, roiCanvas.height)
        }            
      }
      e.preventDefault();
      break;
  }
  
};


document.onkeyup = function(e) {
  if (window.state) {
    let permalinkInputElement = document.getElementById('permalinkInput')
    let permalinkText = window.location.origin + window.location.pathname + '#/' + JSON.stringify(state)
    history.pushState(null, "", permalinkText)
  }
}