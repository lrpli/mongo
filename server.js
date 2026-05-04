const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const MONGO_URI = process.env.MONGO_URI;
const app = express();
let col;

MongoClient.connect(MONGO_URI).then(client => {
  col = client.db("ein25").collection("haveletter25");
  col.createIndex({ name: "text" });
  console.log("MongoDB connected");
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/search", async (req, res) => {
  const { q = "", type = "name", page = 1, dateFrom = "", dateTo = "", hasWebsite = "", sort = "date_desc" } = req.query;
  const limit = 20;
  const skip = (parseInt(page) - 1) * limit;

  const filter = {};

  // 关键词筛选
  if (q.trim()) {
    if (type === "ein") {
      filter.ein = q.trim();
    } else if (type === "website") {
      filter.website = { $regex: q.trim(), $options: "i" };
    } else {
      filter.name = { $regex: q.trim(), $options: "i" };
    }
  }

  // 日期范围
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = dateFrom;
    if (dateTo)   filter.date.$lte = dateTo;
  }

  // 是否有网站
  if (hasWebsite === "yes") {
    filter.website = { $exists: true, $nin: ["null", "", null] };
  } else if (hasWebsite === "no") {
    filter.$or = [{ website: { $exists: false } }, { website: { $in: ["null", "", null] } }];
  }

  // 排序
  const sortMap = {
    date_desc:  { date: -1 },
    date_asc:   { date:  1 },
    name_asc:   { name:  1 },
    name_desc:  { name: -1 },
    ein_asc:    { ein:   1 },
    ein_desc:   { ein:  -1 },
  };
  const sortOpt = sortMap[sort] || { date: -1 };

  const [total, results] = await Promise.all([
    col.countDocuments(filter),
    col.find(filter).sort(sortOpt).skip(skip).limit(limit).toArray(),
  ]);

  res.json({ total, results });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`http://0.0.0.0:${PORT}`));
