// Shared extraction contract for generated previews and legacy banner assets.
function bannerBehaviour(themeJs) {
  const start = '/* US-BANNER-BEHAVIOUR:START */';
  const end = '/* US-BANNER-BEHAVIOUR:END */';
  if (themeJs.split(start).length !== 2 || themeJs.split(end).length !== 2) {
    throw Error('Missing or duplicate banner behaviour section in zUnionSuite.js.');
  }
  const code = themeJs.split(start)[1].split(end)[0].trim();
  if (!code.includes('window.UnionSuiteBanners')) throw Error('Missing banner API.');
  return code;
}
module.exports = {bannerBehaviour};
