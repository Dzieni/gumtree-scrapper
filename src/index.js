import config from '@config'
import {getOfferList, getOfferData} from '@app/gumtree'
import sendOffer from '@app/mail'
import idDb from '@app/idDb'
import tmpInit from '@app/tmp'
import offerFilter from '@app/filter'
import process from 'process'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let timerRunning = false

const timer = async () => {
	if (timerRunning) {
		return console.log('Skipping cycle, the previous one is still running.')
	}

	console.log('Starting cycle...')
	const startTime = process.hrtime()
	timerRunning = true
	await Promise.all(
		config.urls.map(async url => {
			const offers = await getOfferList(url)
			await Promise.all(
				offers
					.filter(o => !idDb.isDuplicate(o.id))
					.map(async ({id, url}) => {
						let retryCount = 0
						let success

						const fn = async () => {
							const iteration = retryCount
							const offer = await getOfferData(url)

							if (success || iteration < retryCount) return
							if (offerFilter(offer)) {
								await sendOffer(offer)
							}

							idDb.add(id)
							success = true
						}

						fn()
						while (!success) {
							await sleep(10000)
							if (!success) {
								if (retryCount >= 5) {
									console.log(`Skipped getting offer #${id} after 5 tries :(`)
									return
								}
								console.log(`Trying do get offer #${id} again...`)
								retryCount++
								fn()
							}
						}
					})
			)
		})
	)
	await idDb.save()
	timerRunning = false
	const diff = process.hrtime(startTime)
	console.log(
		`Cycle done. Took ${Math.floor(diff[0] * 1000 + diff[1] / 1000000)} ms.`
	)
}

const start = async () => {
	if (config.disableMail) {
		console.log(
			'WARNING: Mail sending is disabled! To turn it on, modify your configuration.'
		)
	}
	await tmpInit()
	await idDb.load()
	timer()
	setInterval(() => timer(), config.interval * 1000)
}

start()
