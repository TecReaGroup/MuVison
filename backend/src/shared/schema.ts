/** JSON-schema for a required, non-blank, human-entered name such as a title, creator or album. */
export const NAME_FIELD_SCHEMA = { type: 'string', minLength: 1, maxLength: 200, pattern: '\\S' } as const
