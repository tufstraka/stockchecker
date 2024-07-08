'use strict';

const axios = require('axios');
const CryptoJS = require('crypto-js');

let likesData = {};

const getStockData = async (stockSymbol) => {
  const response = await axios.get(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`);
  return {
    stock: response.data.symbol,
    price: response.data.latestPrice,
  };
};

const hashIP = (ip) => {
  return CryptoJS.SHA256(ip).toString(CryptoJS.enc.Hex);
};

const updateLikes = (stockSymbol, hashedIp) => {
  if (!likesData[stockSymbol]) {
    likesData[stockSymbol] = new Set();
  }
  likesData[stockSymbol].add(hashedIp);
};

const getLikesCount = (stockSymbol) => {
  return likesData[stockSymbol] ? likesData[stockSymbol].size : 0;
};

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const stockSymbols = req.query.stock;
      const like = req.query.like === 'true';
      const hashedIp = hashIP(req.ip);

      if (!stockSymbols) {
        return res.status(400).json({ error: 'Stock query parameter is required' });
      }

      const symbols = Array.isArray(stockSymbols) ? stockSymbols : [stockSymbols];

      try {
        const stockDataPromises = symbols.map(symbol => getStockData(symbol));
        const stockDataArray = await Promise.all(stockDataPromises);

        if (like) {
          symbols.forEach(symbol => updateLikes(symbol, hashedIp));
        }

        if (symbols.length === 1) {
          const stockData = stockDataArray[0];
          res.json({
            stockData: {
              stock: stockData.stock,
              price: stockData.price,
              likes: getLikesCount(stockData.stock)
            }
          });
        } else {
          const [stock1, stock2] = stockDataArray;
          const rel_likes1 = getLikesCount(stock1.stock) - getLikesCount(stock2.stock);
          const rel_likes2 = getLikesCount(stock2.stock) - getLikesCount(stock1.stock);

          res.json({
            stockData: [
              {
                stock: stock1.stock,
                price: stock1.price,
                rel_likes: rel_likes1
              },
              {
                stock: stock2.stock,
                price: stock2.price,
                rel_likes: rel_likes2
              }
            ]
          });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stock price' });
      }
    });
};
