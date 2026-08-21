const COMPANY_WIDE_ROLES = ["admin", "executive"];

/**
 * Returns a Mongo filter fragment scoping results to the user's branch.
 * admin/executive see every branch (optionally narrowed by a `?branch=` query
 * param, e.g. for an executive drilling into one branch's report); manager/
 * employee are always locked to their own branchCode, full stop — a branch
 * query param from them is ignored rather than trusted.
 */
function branchFilter(user, requestedBranch) {
  if (COMPANY_WIDE_ROLES.includes(user.role)) {
    return requestedBranch ? { branchCode: requestedBranch.toUpperCase() } : {};
  }
  return { branchCode: user.branchCode };
}

/** Throws if a manager/employee tries to act on a branch other than their own. */
function assertOwnBranch(user, branchCode) {
  if (COMPANY_WIDE_ROLES.includes(user.role)) return;
  if (user.branchCode !== (branchCode || "").toUpperCase()) {
    const err = new Error("You can only act within your own branch");
    err.status = 403;
    err.code = "BRANCH_FORBIDDEN";
    throw err;
  }
}

/** The branch to write a new record under: the user's own branch, or an explicit one for admin/executive. */
function resolveWriteBranch(user, requestedBranch) {
  if (COMPANY_WIDE_ROLES.includes(user.role)) {
    if (!requestedBranch) {
      const err = new Error("branchCode is required");
      err.status = 400;
      err.code = "BAD_REQUEST";
      throw err;
    }
    return requestedBranch.toUpperCase();
  }
  return user.branchCode;
}

module.exports = { branchFilter, assertOwnBranch, resolveWriteBranch, COMPANY_WIDE_ROLES };
