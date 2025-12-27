import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    const days = req.query.days || 60;

    const today = new Date();
    const toDate = today.toISOString().split("T")[0];
    const fromDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const nseUrl = `https://www.nseindia.com/api/historical/securityArchives?from=${fromDate}&to=${toDate}&symbol=${symbol}&dataType=DELIVERY&series=EQ`;
    const bseSearchUrl = `https://api.bseindia.com/BseIndiaAPI/api/StockSearch/w?scripname=${symbol}`;

    const headers = { "User-Agent": "Mozilla/5.0" };

    // fetch BSE scrip code
    const bseSearchResp = await fetch(bseSearchUrl, { headers });
    const scripData = await bseSearchResp.json();
    const scripcode = scripData.d[0]?.scripcode || "";

    const bseUrl = `https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=${scripcode}&flag=0&fromdate=&todate=`;

    // fetch NSE data
    const nseResp = await fetch(nseUrl, { headers });
    const nseJson = await nseResp.json();

    let nseRows = nseJson.data.map(r => ({
      exchange: "NSE",
      date: r.FH_DATE,
      symbol: symbol,
      volume: r.CH_TOTAL_TRD_QTY,
      deliveryQty: r.DELIV_QTY,
      deliveryPercent: r.DELIV_PER,
      delta: r.CH_TOTAL_TRD_QTY - r.DELIV_QTY
    }));

    // fetch BSE data
    const bseResp = await fetch(bseUrl, { headers });
    const bseJson = await bseResp.json();

    let bseRows = bseJson.d.map(r => ({
      exchange: "BSE",
      date: r.dttm.substring(0, 10),
      symbol: symbol,
      volume: r.ttv,
      deliveryQty: r.dqty,
      deliveryPercent: r.delv,
      delta: r.ttv - r.dqty
    }));

    return res.status(200).json([...nseRows, ...bseRows]);
  } catch (e) {
    return res.status(500).json({ error: "Error fetching data", detail: e.toString() });
  }
}
