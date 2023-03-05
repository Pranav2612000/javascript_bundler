const { transformSync } = require('@babel/core');

exports.transformFile = function (code) {
  const transformResult = { code: '' };

  try {
    transformResult.code = transformSync(code, {
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code;
  } catch (err) {
    console.log(err);
    transformResult.error = err.message;
  }
  return transformResult;
}
