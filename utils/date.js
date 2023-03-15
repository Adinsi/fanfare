/**La fonction permet de renvoyer la date au format JJ/MM/YYYY - hh:mm */
module.exports.dateFormat = (num) => {
  let options = {
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  let timestatmp = Date.parse(num);
  let date = new Date(timestatmp).toLocaleDateString("bj-BJ", options);
  return date.toString();
};
