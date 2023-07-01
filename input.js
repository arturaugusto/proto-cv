// INPUT



// const setRoiCanvasSel = (canvas, ctx) => {
//   // Variables to store the region of interest
//   var startX, startY, endX, endY;
//   var isDrawing = false;

//   // Add event listeners for mouse events
//   canvas.addEventListener('mousedown', handleMouseDown);
//   canvas.addEventListener('mousemove', handleMouseMove);
//   canvas.addEventListener('mouseup', handleMouseUp);

//   // Handle the mouse down event
//   function handleMouseDown(event) {
//     startX = event.clientX - canvas.offsetLeft;
//     startY = event.clientY - canvas.offsetTop;
//     isDrawing = true;
//   }

//   // Handle the mouse move event
//   function handleMouseMove(event) {
//     if (!isDrawing) return;

//     endX = event.clientX - canvas.offsetLeft;
//     endY = event.clientY - canvas.offsetTop;


//     // Clear the canvas
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     // Draw the region of interest
//     ctx.strokeStyle = 'red';
//     ctx.lineWidth = 2;
//     ctx.strokeRect(startX, startY, endX - startX, endY - startY);
//     console.log(startX, startY, endX - startX, endY - startY)
//   }

//   // Handle the mouse up event
//   function handleMouseUp() {
//     isDrawing = false;

//     // Perform actions with the region of interest
//     var roiWidth = endX - startX;
//     var roiHeight = endY - startY;
//     console.log('Region of Interest:', startX, startY, roiWidth, roiHeight);
//   }
// }

// setRoiCanvasSel(roiCanvas, roiCanvasCtx)


function makeElementDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  element.addEventListener('mousedown', dragMouseDown);
  element.addEventListener('touchstart', dragMouseDown);

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    if (e.type === 'touchstart') {
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      document.addEventListener('touchend', closeDragElement);
      document.addEventListener('touchmove', elementDrag);
    } else {
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.addEventListener('mouseup', closeDragElement);
      document.addEventListener('mousemove', elementDrag);
    }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    if (e.type === 'touchmove') {
      pos1 = pos3 - e.touches[0].clientX;
      pos2 = pos4 - e.touches[0].clientY;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
    } else {
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
    }
    element.parentElement.style.top = (element.offsetTop - pos2) + "px";
    element.parentElement.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
    document.removeEventListener('touchend', closeDragElement);
    document.removeEventListener('touchmove', elementDrag);
  }
}

makeElementDraggable(document.getElementById('roiCanvas'))


document.onkeyup = function(e) {
  if (window.state) {
    let permalinkInputElement = document.getElementById('permalinkInput')
    let permalinkText = window.location.origin + window.location.pathname + '#/' + JSON.stringify(state)
    history.pushState(null, "", permalinkText)
  }
}