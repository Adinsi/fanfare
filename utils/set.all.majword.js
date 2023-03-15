module.exports = (toFirstWord, texte) => {
  /*Tranformer chaque début de mot en maj */

  let newText =
    toFirstWord == true ? texte.charAt(0).toUpperCase() : texte.charAt(0);
  for (let i = 0; i < texte.length - 1; i++) {
    if (texte.charAt(i).match(/\s/) && texte.charAt(i + 1).match(/[a-z]/)) {
      newText += texte.charAt(i + 1).toUpperCase();
    } else {
      newText += texte.charAt(i + 1);
    }
  }
  return newText;
};
