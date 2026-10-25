const { ValidationError } = require("../errors/AppError");

// Waliduje params, query i body; zbiera błędy ze wszystkich części naraz.
// Wynik ląduje w req.validated – req.query w Express 5 jest tylko do odczytu.
function validate(schemas) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const part of ["params", "query", "body"]) {
      if (!schemas[part]) continue;

      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({
            location: part,
            field: issue.code === "unrecognized_keys" ? issue.keys.join(", ") : issue.path.join("."),
            message: issue.message,
          });
        }
      }
    }

    if (details.length > 0) return next(new ValidationError(details));

    req.validated = validated;
    next();
  };
}

module.exports = validate;
