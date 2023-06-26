// INPUT


document.onkeydown = function(e) {
  // return
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

    case 49:
      state.roiConfSel.format = '8'
      e.preventDefault();
      break;
    case 50:
      state.roiConfSel.format = '8.8'
      e.preventDefault();
      break;
    case 51:
      state.roiConfSel.format = '8.8.8'
      e.preventDefault();
      break;
    case 52:
      state.roiConfSel.format = '8.8.8.8'
      e.preventDefault();
      break;
    case 53:
      state.roiConfSel.format = '8.8.8.8.8'
      e.preventDefault();
      break;
    case 54:
      state.roiConfSel.format = '8.8.8.8.8.8'
      e.preventDefault();
      break;
    case 55:
      state.roiConfSel.format = '8.8.8.8.8.8.8'
      e.preventDefault();
      break;
    case 56:
      state.roiConfSel.format = '8.8.8.8.8.8.8.8'
      e.preventDefault();
      break;
    case 57:
      state.roiConfSel.format = '8.8.8.8.8.8.8.8.8'
      e.preventDefault();
      break;



    
    case 84:
      state.showpp = !state.showpp
      e.preventDefault();
      break;

    case 37:
      // console.log('left');
      if (e.ctrlKey) {
        state.roiConfSel.gap = Math.max(state.roiConfSel.gap-1, 0)
        e.preventDefault();
        break;
      }

      if (e.shiftKey) {
        state.roiConfSel.skew = Math.max(state.roiConfSel.skew-0.5, -30)
        e.preventDefault();
        break;
      }

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

      if (e.shiftKey) {
        state.roiConfSel.gamma = Math.min(state.roiConfSel.gamma+0.2, 6)
        e.preventDefault();
        break;
      }

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

      if (e.ctrlKey) {
        state.roiConfSel.gap = Math.min(state.roiConfSel.gap+1, 100)
        e.preventDefault();
        break;
      }

      if (e.shiftKey) {
        state.roiConfSel.skew = Math.min(state.roiConfSel.skew+0.5, 30)
        e.preventDefault();
        break;
      }

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
      if (e.shiftKey) {
        state.roiConfSel.gamma = Math.max(state.roiConfSel.gamma-0.2, 0.02)
        e.preventDefault();
        break;
      }

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