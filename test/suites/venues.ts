//Control execution order
import './regions'

import { TickeTing, Venue, BadDataError,  ResourceExistsError, ResourceNotFoundError } from '../../src'
import { VenueModel } from  '../../src/model'
import { Collection } from  '../../src/util'
import { expect } from '../setup'

//Global venue object
let testVenue = null

describe("Venues", function(){
  //Set timeout for tests in suite
  this.timeout(10000)

  before(async function(){
    //Setup SDK for testing
    this.ticketing = new TickeTing({
      apiKey: "07b2f3b08810a4296ee19fc59dff48b0",
      sandbox: true
    })

    //Create a region for use in venue creation
    this.venueRegion = await this.ticketing.regions.create({
      "name": "Venue Region "+Math.floor(Math.random() * 999999),
      "country": "New Country"
    })

    //Initialise test data for suite
    this.testVenueData = {
      name: "Test Venue "+Math.floor(Math.random() * 999999),
      region: this.venueRegion.id,
      longitude: -73.99214,
      latitude: 40.75518,
      address: "7th Ave, Manhattan, New York"
    }

    //A venue to test duplication
    this.secondVenue = await this.ticketing.venues.create({
      name: "Test Venue "+Math.floor(Math.random() * 999999),
      region: this.venueRegion.id,
      longitude: -70.99214,
      latitude: 43.75518,
      address: "Miami Beach, Miami, Florida"
    })
  })

  after(async function(){
    await this.secondVenue.delete()
    this.venueRegion.delete()
  })

  describe('Create an event venue', function () {
    it('Should return a valid venue object', function () {
      return new Promise((resolve, reject) => {
        this.ticketing.venues.create(this.testVenueData).then((venue => {
          testVenue = venue

          expect(venue)
            .to.be.an.instanceof(VenueModel)
            .and.to.include(this.testVenueData)
            .and.to.have.property("map", "https://maps.googleapis.com/maps/api/staticmap?center=40.75518,-73.99214&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C40.75518,-73.99214&key=AIzaSyCyLy8bOLUTLbQLVQFwf1eVO2UIVO8_4kQ&signature=IowClV__Bha7DFVe7TIG-osgyDE=")

          resolve(true)
        })).catch(error=>{
          reject(error)
        })
      })
    })

    it('Should throw a BadDataError if required fields are missing', function () {
      return expect(this.ticketing.venues.create({
        name: "",
        region: "",
        longitude: "",
        latitude: "",
        address:""
      }))
      .to.eventually.be.rejectedWith("The following arguments are required, but have not been supplied: name, region, address, longitude, latitude.")
      .and.be.an.instanceOf(BadDataError)
    })

    it('Should throw a ResourceExistsError when using an existing name', function () {
      return expect(this.ticketing.venues.create(this.testVenueData))
        .to.eventually.be.rejectedWith("The following arguments conflict with those of another venue: name.")
        .and.be.an.instanceOf(ResourceExistsError)
    })
  })

  describe('List event venues', function () {
    it('Should return a collection of Venue resources', function () {
      return expect(this.ticketing.venues.list()).eventually.to.all.be.instanceof(VenueModel)
    })

    it('Should return a collection of venues matching the region filter', function () {
      return expect(this.ticketing.venues.list().filter({region: this.venueRegion.id})).eventually.to.all.have.property("region", this.venueRegion.id)
    })

    it('Should contain the newly created venue as its last resource', function () {
      return new Promise((resolve, reject) => {
        this.ticketing.venues.list(1).last().then(venues => {
          expect(venues[0]).to.be.an.instanceOf(VenueModel)
          expect(venues[0].name).to.equal(this.testVenueData.name)
          expect(venues[0].region).to.equal(this.testVenueData.region)
          expect(venues[0].address).to.equal(this.testVenueData.address)
          expect(venues[0].latitude).to.be.closeTo(this.testVenueData.latitude, 0.0001)
          expect(venues[0].longitude).to.be.closeTo(this.testVenueData.longitude, 0.0001)

          resolve(true)
        }).catch(error => {
          reject(error)
        })
      })
    })
  })

  describe('Fetch a venue', function () {
    it('Should return the identified Venue resource', function () {
      return new Promise((resolve, reject) => {
        this.ticketing.venues.find(testVenue.id).then(venue => {
          expect(venue).to.be.an.instanceOf(VenueModel)
          expect(venue.name).to.equal(this.testVenueData.name)
          expect(venue.region).to.equal(this.testVenueData.region)
          expect(venue.address).to.equal(this.testVenueData.address)
          expect(venue.latitude).to.be.closeTo(this.testVenueData.latitude, 0.0001)
          expect(venue.longitude).to.be.closeTo(this.testVenueData.longitude, 0.0001)

          resolve(true)
        }).catch(error => {
          reject(error)
        })
      })
    })

    it('Should throw a ResourceNotFoundError when using a non-existant ID', function () {
      return expect(this.ticketing.venues.find(12345))
        .to.eventually.be.rejectedWith("There is presently no resource with the given URI.")
        .and.be.an.instanceOf(ResourceNotFoundError)
    })
  })

  describe('Update a venue', function () {
    it('Should save the changes made to the venue', function () {
      //Make changes to the venue
      testVenue.name = "New Name"
      testVenue.address = "#1 High St., St. John's"

      //Save changes
      return expect(testVenue.save()).eventually.be.true
    })

    it('Should persist venue changes', function () {
      return expect(this.ticketing.venues.find(testVenue.id))
        .to.eventually.include({
          "name": "New Name",
          "address": "#1 High St., St. John's"
        })
    })

    it('Should throw a BadDataError if required fields are missing', function () {
      //Make invalid changes to the venue
      testVenue.name = ""
      testVenue.address = ""
      testVenue.latitude = ""

      return expect(testVenue.save())
        .to.eventually.be.rejectedWith("The following arguments are required, but have not been supplied: name, address, latitude.")
        .and.be.an.instanceOf(BadDataError)
    })

    it('Should throw a ResourceExistsError when using an existing name', function () {
      //Attempt to change the name of the existing venue to that of the second one
      testVenue.name = this.secondVenue.name

      return expect(testVenue.save())
        .to.eventually.be.rejectedWith("The following arguments conflict with those of another venue: name.")
        .and.be.an.instanceOf(ResourceExistsError)
    })
  })

  describe('Delete a venue', function () {
    it('Should delete the venue from the system', function () {
      return expect(testVenue.delete()).to.eventually.be.true
    })

    it('Venue should no longer be retrievable', function () {
      return expect(this.ticketing.venues.find(testVenue.id))
        .to.eventually.be.rejectedWith("There is presently no resource with the given URI.")
        .and.be.an.instanceOf(ResourceNotFoundError)
    })
  })
})