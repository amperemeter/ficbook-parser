const needle = require("needle");
const cheerio = require("cheerio");

module.exports.scrape = async (fanficContext, props) => {
  let hotArticles = 0, link = fanficContext.url;

  const timeout = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const options = {
    open_timeout: 60000,
    user_agent: 'MyApp/1.2.3',
    parse_response: false,
  };

  async function getLastPage() {
    await needle('get', `${link}?p=1`, options)
      .then(async res => {
        const $ = cheerio.load(res.body);
        await timeout(1000); // имитируем действия человека

        if (!$(".content-section").length) {
          throw new Error(`${fanficContext.name}\nнет страницы фэндома`);
        }

        const page = $(".pagenav .paging-description b:last-of-type").html() || '1';

        // проверить наличие блока с "горячими работами"
        const blockSeparator = $(".block-separator");

        if (blockSeparator.length) {
          hotArticles = blockSeparator.parent('section').children('article').length;
        }

        return page;
      })
      .then(async page => {
        await getArticles(page);
      })
      .catch(err => {
        console.log(`${err.message}\n`);
      });
  }

  async function getArticles(page) {
    await needle('get', `${link}?p=${page}`, options)
      .then(async res => {
        const $ = cheerio.load(res.body);
        await timeout(1000); // имитируем действия человека

        // вычислить количество фанфиков
        const articlesOnLastPage = $(".fanfic-inline").length;
        const articles = (page - 1) * 20 + articlesOnLastPage - hotArticles;

        if (articles) {
          await fanficContext.setArticleCount(articles); // установить значение в свойство articleCount
          await fanficContext.checkNew(); // проверить разницу между oldArticleCount и articleCount
          await fanficContext.saveData(props.changedFanfics); // сохранить данные
          await fanficContext.saveCount(props.collection); // сохранить кол-во новых работ
        } else {
          console.log(`${fanficContext.name}\nнет работ\n`);
        }
      })
      .catch(err => {
        console.log(`${err.message}\n`);
      });
  }

  await getLastPage();
}