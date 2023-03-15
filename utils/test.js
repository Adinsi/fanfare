function generateCode() {
  let code = "";
  for (let i = 0; i < 3; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

const ok = generateCode();
console.log(0 + ok, ok);
