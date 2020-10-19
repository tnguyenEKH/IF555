let Keyboard = window.SimpleKeyboard.default;

let keyboard = new Keyboard({
  onKeyPress: button => onKeyPress(button)
});

function onKeyPress(button) {
  tastascii=0;
  tastkey = button;
  tastkeylength = tastkey.length;
  tastcode = button.charCodeAt(0);
  if (tastkeylength < 2) {         /* ein einzelnes Zeichen  */
    tastascii=tastkey.charCodeAt(0);
  }
  else {
    switch (tastcode) {
 
    case 123:  //  ENTER
      tastascii=13;
      break;

    case 27:  //  ESC
      tastascii=27;
      break;
    case 17:  //  STRG
      tastascii=17;
      break; 

    default:
    }
  }
  if (tastascii > 0)  {
    var TastURLId = TastURL + tastascii;
    var data = getData(TastURLId);
  }
  if (zykzaehler > einmalholen) {
    zykzaehler=einmalholen;
    tastzaehler=0;
  }
  else  {
//  zykzaehler=zykzaehler+1;
    tastzaehler=einmalholen;
  }

  /*If you want to handle the shift and caps lock buttons*/
  if (button === "{shift}" || button === "{lock}") handleShift();
}

function handleShift() {
  let currentLayout = keyboard.options.layoutName;
  let shiftToggle = currentLayout === "default" ? "shift" : "default";

  keyboard.setOptions({
    layoutName: shiftToggle
  });
}
