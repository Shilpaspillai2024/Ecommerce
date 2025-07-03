const STATUS_CODES=require("../constants/statusCodes")

module.exports = (err, req, res, next) => {
  
  const status = err.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
  const is404 = status === STATUS_CODES.NOT_FOUND;

  try {
    res.status(status).render(is404 ? "pageNotfound" : "error", {
      title: is404 ? "Page Not Found" : "Something went wrong",
      message: err.message || "Internal Server Error"
    });
  } catch (renderError) {
    console.error("Error rendering error page:", renderError.message);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Something went wrong.");
  }
};
