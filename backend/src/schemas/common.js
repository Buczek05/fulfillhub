const { z } = require("zod");

// Elementy powtarzające się w wielu modułach: :id w ścieżce i parametry paginacji.
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const paginationSchema = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
};

function paginate({ data, total, page, pageSize }) {
  return { data, page, pageSize, total };
}

module.exports = { idParamSchema, paginationSchema, paginate };
