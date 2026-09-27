/**
 * Extra columns on the Better Auth `"user"` row.
 * `input: false` so a signup cannot set its own cohort — only the owner desk can.
 */
export const userAdditionalFields = {
  role: {
    type: "string" as const,
    required: false,
    defaultValue: "user",
    input: false,
  },
};
