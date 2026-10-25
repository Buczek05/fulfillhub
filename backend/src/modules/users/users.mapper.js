// password_hash nigdy nie opuszcza backendu – mapper jest jedyną drogą użytkownika do odpowiedzi.
function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    shopId: user.shopId ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

module.exports = { toUserResponse };
