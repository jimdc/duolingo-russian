  const genderColors = {
    "Masculine" : "Blue",
    "Feminine" : "Pink",
    "Neuter" : "Green"
  };

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
