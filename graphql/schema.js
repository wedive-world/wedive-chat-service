const {
  makeExecutableSchema
} = require('@graphql-tools/schema')

const { loadFilesSync } = require('@graphql-tools/load-files')

const {
  mergeTypeDefs,
  mergeResolvers
} = require('@graphql-tools/merge')

// loadFilesSync로, 현재폴더(__dirname)에 있는, 모든폴더(**) 속,
// typeDefs.js로 끝나는 모든파일(*) 불러오기
const loadedTypes = loadFilesSync(`${__dirname}/**/*.typeDefs.js`);

// loadFilesSync로, 현재폴더(__dirname)에 있는, 모든폴더(**) 속,
// queries.js와 mutations.js로 끝나는 모든파일(*) 불러오기
const loadedResolvers = loadFilesSync(
  `${__dirname}/**/*.resolver.js`
);

// 불러온 typeDefs 합치기
const typeDefs = mergeTypeDefs(loadedTypes);

// 불러온 Queries, Mutations 합치기
const resolvers = mergeResolvers(loadedResolvers);

// 합쳐진 typeDefs, resolvers로 Schema 만들기
const schema = makeExecutableSchema({ typeDefs, resolvers });

// export defult로 최종 Schema 내보내기
module.exports = schema;