var BLACKLIST = {};

AUTH(function($) {

	if (BLACKLIST[$.ip] > 15) {
		$.invalid();
		return;
	}

	var token = $.cookie(CONF.cookie);
	if (token) {
		var session = DECRYPTREQ($.req, token, CONF.cookie_secret);
		if (session && session.id === PREF.user.id && session.expire > NOW) {
			$.success({ sa: true });
			return;
		} else
			BLACKLIST[$.ip] = (BLACKLIST[$.ip] || 0) + 1;
	}

	$.invalid();
});

if (!PREF.user) {
	var password = "typerefinery";
	PREF.set('user', { id: UID(), login: password, password: password.sha256(CONF.cookie_secret), raw: password });
}

ON('service', function(counter) {
	if (counter % 15 === 0)
		BLACKLIST = {};
});
