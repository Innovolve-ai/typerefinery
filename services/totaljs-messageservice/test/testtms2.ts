require("total4")
global.TMSCLIENT(
  "http://localhost:8112/$tms/",
  "",
  function (err, client, meta) {
    console.log("started")
    // @err {Error/String}
    // @client {WebSocketClient} with extended functionality
    // @meta {Object}
    // client.subscribe(name, callback);
    // client.publish(name, data);
    // client.call(name, data, callback, [timeout]);
    client.subscribe("svg_insert", function (response) {
      // @response {Object}
      console.log(response)
    })
  }
)
