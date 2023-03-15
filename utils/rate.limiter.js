const rate_limiter = (maxRequests, timeInterval) => {
  const requestTracker = {};
  return (req, res, next) => {
    const currentTime = new Date().getTime();
    const userIp = req.userIp;
    /*Initialise request count if the Ip has  not been seen before */
    if (!requestTracker[userIp]) {
      requestTracker[userIp] = {
        requestCount: 1,
        firstRequestTime: currentTime,
      };
    } else {
      /*Check if time interval has expired */
      if (
        currentTime - requestTracker[userIp].firstRequestTime >
        timeInterval
      ) {
        /*Reset request count and first request time */
        requestTracker[userIp].requestCount = 1;
        requestTracker[userIp].firstRequestTime = currentTime;
      } else {
        /*Increment request count*/
        requestTracker[userIp].requestCount++;
      }
    }
    /*Check if the request count has been exceeded */
    if (requestTracker[userIp].requestCount > maxRequests) {
      return res.status(429).json({ error: "Too may requests" });
    }
    next();
  };
};

module.exports = rate_limiter;
