import crypto from "node:crypto";

const _conf = (conf) => {
		const { accessKeyId, secretAccessKey, sessionToken } = conf;
		delete conf.accessKeyId;
		delete conf.secretAccessKey;
		conf.credentials = {
			accessKeyId,
			secretAccessKey,
		};
		if (sessionToken) {
			delete conf.sessionToken;
			conf.credentials.sessionToken = sessionToken;
		}
		return conf;
	},
	RT = (bucket, conf) => {
		const { url } = conf;
		delete conf.url;
		return [url, bucket, _conf(conf)];
	};

const OSS = {
	BACKBLAZE: RT,
	ALIYUN: RT,
	AWS: RT,
	R2: RT,
	DOGECLOUD: async (bucket, { url, accessKey, secretKey }) => {
		const body = JSON.stringify({
				channel: "OSS_UPLOAD",
				scopes: [bucket + ":*"],
			}),
			api = "/auth/tmp_token.json",
			authorization =
				"TOKEN " +
				accessKey +
				":" +
				crypto
					.createHmac("sha1", secretKey)
					.update(Buffer.from(api + "\n" + body, "utf8"))
					.digest("hex"),
			{
				data: { Credentials, Buckets },
			} = await (
				await fetch("https://api.dogecloud.com" + api, {
					method: "POST",
					body,
					headers: {
						"Content-Type": "application/json",
						Authorization: authorization,
					},
				})
			).json(),
			Bucket = Buckets[0],
			{ sessionToken } = Credentials;

		_conf(Credentials);
		Credentials.endpoint = Bucket.s3Endpoint;
		return [url, Bucket.s3Bucket, Credentials];
	},
};

export default async (bucket) => {
	const { env } = process,
		conf = {},
		r = [];

	for (var [k, v] of Object.entries(env)) {
		var pos = k.indexOf("_");
		if (~pos) {
			var key = k.slice(0, pos);
			if (key in OSS) {
				var o = conf[key];
				if (!o) {
					conf[key] = o = {};
				}
				o[k.slice(pos + 1)] = v;
			}
		}
	}

	for (var [k, v] of Object.entries(conf)) {
		r.push((await OSS[k](bucket, v)).concat(k));
	}
	return r;
};
