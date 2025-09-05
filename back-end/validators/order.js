const Validator = require("fastest-validator");
const v = new Validator();

const schema = {
  name: {
    type: "string",
    min: 3,
    max: 255,
  },
  phone: {
    type: "string",
    pattern: /^(\+98|098|98|0)?9\d{9}$/,
    messages: {
      stringPattern: "شماره تلفن معتبر نیست",
    },
  },
  products: {
    type: "array",
    items: { type: "enum", values: ["concrete", "foam", "joist", "truss"] },
    min: 1,
    messages: {
      arrayMin: "حداقل یکی از محصولات باید انتخاب شود",
    },
  },
  description: {
    type: "string",
    optional: true,
    max: 5000,
  },
  $$strict: true,
};

const check = v.compile(schema);

module.exports = check;
