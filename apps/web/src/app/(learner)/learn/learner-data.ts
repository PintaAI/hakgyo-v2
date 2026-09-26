import "server-only";

import { cache } from "react";

import { api } from "~/trpc/server";

// The learner layout and pages render in the same request; share one call for
// procedures both of them need.
export const getMyCourses = cache(() => api.learning.listMyCourses());
