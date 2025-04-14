const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");
const request = require('request'); // 引入 request 模块

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

// 获取手机号接口
app.post('/phone', (req, res) => {
  const openid = req.headers['x-wx-openid'];
  if (!openid) {
    console.error('请求头中缺少 x-wx-openid');
    res.status(400).send({ code: 400, message: '缺少 x-wx-openid' });
    return;
  }

  const api = `https://api.weixin.qq.com/wxa/getopendata?openid=${openid}`;
  console.log('请求微信开放接口的 URL:', api);
  console.log('请求体:', JSON.stringify({
    cloudid_list: [req.body.cloudid],
  }));

  request(api, {
    method: 'POST',
    body: JSON.stringify({
      cloudid_list: [req.body.cloudid],
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  }, (err, resp, body) => {
    if (err) {
      console.error('请求微信开放接口时发生错误:', err);
      res.status(500).send({ code: 500, message: '请求微信开放接口时发生错误' });
      return;
    }

    console.log('微信开放接口响应状态码:', resp.statusCode);
    console.log('微信开放接口响应体:', body);

    try {
      const data = JSON.parse(body).data_list[0];
      const phone = JSON.parse(data.json).data.phoneNumber;
      res.send({ code: 0, data: phone });
    } catch (error) {
      console.error('解析微信开放接口响应时发生错误:', error);
      res.status(500).send({ code: 500, message: '解析微信开放接口响应时发生错误' });
    }
  });
});

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
