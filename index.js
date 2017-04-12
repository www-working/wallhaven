const axios = require('axios')
const cheerio = require('cheerio')

const ALL_CATEGORIES = ['general', 'anime', 'people']

function recrawler(url) {
  return axios.get(url)
    .then(res => {
      return cheerio.load(res.data, {
        decodeEntities: false
      })
    })
}

function hasCategory(cat) {
  return String(Number(ALL_CATEGORIES.indexOf(cat) > -1))
}

function getResolution(text) {
  return text.split('x').map(v => Number(v.trim()))
}

module.exports = class Wallhaven {
  search(keyword = '', {
    categories = ALL_CATEGORIES,
    page = 1
  } = {}) {
    keyword = encodeURIComponent(keyword)
    categories = categories.map(cat => hasCategory(cat)).join('')

    return recrawler(`https://alpha.wallhaven.cc/search?q=${keyword}&categories=${categories}&page=${page}&purity=100&sorting=relevance&order=desc`)
      .then($ => {
        const result = {
          end: !$('.next').length,
          totalPages: Number($('.thumb-listing-page-header h2').contents().eq(2).text().replace(/[^\d]/g, '')),
          images: []
        }
        $('.thumb-listing-page ul li').each(function () {
          const id = Number($(this).find('.thumb-anime').attr('data-wallpaper-id'))
          const resolution = getResolution($(this).find('.wall-res').text())

          result.images.push({
            id,
            width: resolution[0],
            height: resolution[1],
            thumb: `https://alpha.wallhaven.cc/wallpapers/thumb/small/th-${id}.jpg`
          })
        })
        return result
      })
  }

  details(id) {
    return recrawler(`https://alpha.wallhaven.cc/wallpaper/${id}`)
      .then($ => {
        const tags = []
        $('.tag').each(function () {
          tags.push({
            id: Number($(this).attr('data-tag-id')),
            text: $(this).find('.tagname').text()
          })
        })

        const info = $('#wallpaper-purity-form').next().find('dd')
        const category = info.eq(1).text()
        const size = info.eq(2).text()
        const views = Number(info.eq(3).text().replace(/[^\d]/g, ''))

        const resolution = getResolution($('.showcase-resolution').text())

        return {
          fullImage: $('#wallpaper').attr('src').replace(/^\/\//, 'https://'),
          tags,
          category,
          size,
          views,
          width: resolution[0],
          height: resolution[1]
        }
      })
  }
}
