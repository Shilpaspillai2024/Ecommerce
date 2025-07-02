module.exports = (err, req, res, next) => {
  
  const status = err.status || 500;
  const is404 = status === 404;

  try {
    res.status(status).render(is404 ? "pageNotfound" : "error", {
      title: is404 ? "Page Not Found" : "Something went wrong",
      message: err.message || "Internal Server Error"
    });
  } catch (renderError) {
    console.error("Error rendering error page:", renderError.message);
    res.status(500).send("Something went wrong.");
  }
};
