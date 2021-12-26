const { gql } = require('apollo-server')

module.exports = gql`
  scalar Date

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  type Response {
    success: Boolean
    reason: String
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION
`;