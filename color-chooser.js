//**************************************************************************
//** hasStyleRule
//**************************************************************************
/** Returns true if there is a style rule defined for a given selector.
 *  @param selector CSS selector (e.g. ".deleteIcon", "h2", "#mid")
 */
  var hasStyleRule = function(selector) {

      var hasRule = function(selector, rules){
          if (!rules) return false;
          for (var i=0; i<rules.length; i++) {
              var rule = rules[i];
              if (rule.selectorText){ 
                  var arr = rule.selectorText.split(',');
                  for (var j=0; j<arr.length; j++){
                      if (arr[j].indexOf(selector) !== -1){
                          var txt = trim(arr[j]);
                          if (txt===selector){
                              return true;
                          }
                          else{
                              var colIdx = txt.indexOf(":");
                              if (colIdx !== -1){
                                  txt = trim(txt.substring(0, colIdx));
                                  if (txt===selector){
                                      return true;
                                  }
                              }
                          }
                      }
                  }
              }
          }
          return false;
      };

      var trim = function(str){
          return str.replace(/^\s*/, "").replace(/\s*$/, "");
      };

      for (var i=0; i<document.styleSheets.length; i++){
          var rules = document.styleSheets[i].hasOwnProperty('rules') || document.styleSheets[i].cssRules;
          if (hasRule(selector, rules)){
              return true;
          }

          var imports = document.styleSheets[i].imports;
          if (imports){
              for (var j=0; j<imports.length; j++){
                  rules = imports[j].rules || imports[j].cssRules;
                  if (hasRule(selector, rules)) return true;
              }
          }
      } 

      return false;
  };


  const genderColors = {
    "Masculine" : "Blue",
    "Feminine" : "Pink",
    "Neuter" : "Green"
  };

  function setGenderColorStyle() {
    if (!hasStyleRule(".Masculine")) {
      console.log('has . Masculine defined');
    } else {
      console.log('does not have .Masculine defined');
    }
    /*if (!hasStyleRule(`.${genderColors[0]}`)) {
      let newStyle = '';
      for(let key in genderColors) {
        newStyle += `.${key} { color:${genderColors[key]}; } `;  
      }
      console.info(`Applying global style ${newStyle}`);  
    }*/
  }

  function assignColorForGender(element, gender) { 
    const colorAssignment = genderColors[gender];
    if (colorAssignment !== null) {
        if (element.style.color !== colorAssignment) {
            element.style.color = colorAssignment;
        }
    }
  }

  function colorSpanForGender(word, gender) {
    const colorAssignment = genderColors[gender];
    if (colorAssignment !== null) {
        return `<span style="color:${colorAssignment};">${word}</span>`;
    } else {
      return word;
    }
  }
