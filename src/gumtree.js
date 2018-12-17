import cheerio from 'cheerio'
import fetch from 'node-fetch'

const IMG_URL_PREFIX = 'https://img.classistatic.com/crop/50x50/'
const IMG_URL_DEFAULT_NAME = '$_19.JPG'
const IMG_URL_DESIRED_NAME = '$_20.JPG'

export const getOfferList = async () => {
	const req = await fetch(
		'https://www.gumtree.pl/s-mieszkania-i-domy-do-wynajecia/warszawa/v1c9008l3200008p1'
	)
	const $ = cheerio.load(await req.text())
	return $('.result-link')
		.map((_, el) => ({
			id: $(el)
				.parent()
				.data('adid'),
			url: $(el)
				.find('.href-link')
				.attr('href'),
		}))
		.get()
}

export const getOfferData = async url => {
	const absUrl = `https://www.gumtree.pl${url}`
	const req = await fetch(absUrl)
	const $ = cheerio.load(await req.text())

	const data = {
		id: $('#adId').val(),
		url,
		phoneNumber: $('#phone-number')
			.text()
			.trim(),
		title: $('.item-title')
			.text()
			.trim()
			.replace(/\s\s+/g, ' '),
		contentHtml: $('.vip-details .description .pre').html(),
		price: $('.vip-content-header .price')
			.text()
			.trim(),
		images: $('.thumbs img')
			.map(
				(_, el) =>
					`https://${$(el)
						.attr('src')
						.substr(IMG_URL_PREFIX.length)
						.slice(0, -1 * IMG_URL_DEFAULT_NAME.length)}${IMG_URL_DESIRED_NAME}`
			)
			.get(),
		features: {},
	}

	$('.selMenu li').each((_, el) => {
		const name = $(el)
			.find('.name')
			.text()
			.trim()
		const val = $(el)
			.find('.value')
			.text()
			.trim()
			.replace(/\s\s+/g, ' ')
		if (name && val) {
			data.features[name] = val
		}
	})

	return data
}