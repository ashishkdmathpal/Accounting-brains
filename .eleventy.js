module.exports = function(eleventyConfig) {
  // Path prefix for GitHub Pages deployment
  // Set ELEVENTY_PATH_PREFIX env var in CI/CD for subdirectory deployment
  const pathPrefix = process.env.ELEVENTY_PATH_PREFIX || "/";

  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");

  // NOTE: CSS is handled by PostCSS, not passthrough copy
  // This prevents the uncompiled Tailwind directives from overwriting compiled CSS

  // Add a custom filter for prefixing URLs (works with pathPrefix)
  eleventyConfig.addFilter("prefixUrl", function(url) {
    if (!url) return pathPrefix;
    // Remove leading slash from url if pathPrefix has trailing slash
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const cleanPrefix = pathPrefix.endsWith('/') ? pathPrefix : pathPrefix + '/';
    return cleanPrefix + cleanUrl;
  });

  // Add global data for pathPrefix
  eleventyConfig.addGlobalData("pathPrefix", pathPrefix);

  // Date filter for blog posts
  eleventyConfig.addFilter("dateDisplay", (dateObj) => {
    return new Date(dateObj).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Excerpt filter for blog previews
  eleventyConfig.addFilter("excerpt", (content) => {
    const excerptLength = 150;
    if (content.length <= excerptLength) return content;
    return content.substr(0, excerptLength) + '...';
  });

  // Limit filter for collections
  eleventyConfig.addFilter("limit", (array, limit) => {
    return array.slice(0, limit);
  });

  // Blog posts collection
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/blog/*.md").reverse();
  });

  return {
    pathPrefix: pathPrefix,
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
