module.exports = function () {
	var redis = new Object();
	redis.port = 6379;
    redis.host = "127.0.0.1";
    return redis;
}
