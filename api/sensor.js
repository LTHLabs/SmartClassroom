const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const response = await fetch("http://192.168.43.201/data");
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Gagal mengambil data sensor", detail: err.message });
  }
};
