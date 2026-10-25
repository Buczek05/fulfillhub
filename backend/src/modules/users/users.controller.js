const { toUserResponse } = require("./users.mapper");
const { paginate } = require("../../schemas/common");

function createUsersController(usersService) {
  async function listUsers(req, res) {
    const { page, pageSize, role, q } = req.validated.query;
    const { data, total } = await usersService.list({ page, pageSize, role, q });

    res.json(paginate({ data: data.map(toUserResponse), total, page, pageSize }));
  }

  async function getUser(req, res) {
    const user = await usersService.getById(req.validated.params.id);

    res.json(toUserResponse(user));
  }

  async function createUser(req, res) {
    const user = await usersService.create(req.validated.body);

    res.status(201).location(`/api/users/${user.id}`).json(toUserResponse(user));
  }

  async function updateUser(req, res) {
    const user = await usersService.update(req.validated.params.id, req.validated.body);

    res.json(toUserResponse(user));
  }

  async function deleteUser(req, res) {
    await usersService.deactivate(req.validated.params.id);

    res.status(204).end();
  }

  return { listUsers, getUser, createUser, updateUser, deleteUser };
}

module.exports = { createUsersController };
