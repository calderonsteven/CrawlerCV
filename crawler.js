const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

class Crawler {
  #selectors = {
    votantes: '#tabla-reporte-detallado td:nth-child(1)',
    partidos: '#tabla-reporte-detallado td:nth-child(2)',
    votos: '#tabla-reporte-detallado td:nth-child(3)',
    votantesAbs: '#tabla-reporte-abstenciones td:nth-child(1)',
    partidosAbs: '#tabla-reporte-abstenciones td:nth-child(2)',
  }

  constructor() {
    this.votacionesEndPoint = 'https://congresovisible.uniandes.edu.co/votaciones/search/votaciones/';
    this.votacionesDetailUrl = 'https://congresovisible.uniandes.edu.co/votaciones/';
    
    this.currentVotacionesPage = 1;
    this.thereIsMoreVotacionesInfo = true;
  }

  async extractInnerText(page, selector) {
    return await page.$$eval(selector, nodes => nodes.map(n => n.innerText));
  }
  
  async crawlVotacionDetail(id) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`${this.votacionesDetailUrl}${id}/`);
    
    console.log(`Crawling page ${this.votacionesDetailUrl}${id}/`);

    const votantes = await this.extractInnerText(page, this.#selectors.votantes);
    const partidos = await this.extractInnerText(page, this.#selectors.partidos);
    const votosIndividual = await this.extractInnerText(page, this.#selectors.votos);
    const votantesAbstenidos = await this.extractInnerText(page, this.#selectors.votantesAbs);
    const partidosAbstenidos = await this.extractInnerText(page, this.#selectors.partidosAbs);
    
    await browser.close();
    
    const votos = votantes.map((votante, index) => ({
      votante,
      partido: partidos[index],
      voto: votosIndividual[index]
    }));

    const abstenciones = votantesAbstenidos.map((votante, index) => ({
      votante,
      partido: partidosAbstenidos[index]
    }));

    return { votos, abstenciones };
  } 

  async fetchVotaciones() {
    let allVotaciones = [];

    while(this.thereIsMoreVotacionesInfo && this.currentVotacionesPage <= 2) {
    // while(this.thereIsMoreVotacionesInfo) {
      const votacionesParams = {
        params: {
          q: '%20',
          page: this.currentVotacionesPage
        }
      };
      
      console.log(`Fetching page ${this.currentVotacionesPage}`);
      const response = await axios.get(this.votacionesEndPoint, votacionesParams);
      console.log(' ✅ Done');
      
      allVotaciones = allVotaciones.concat(response.data.elementos);
      ++this.currentVotacionesPage;
    }

    return allVotaciones;
  }

  async prepareData() {
    let votacionesDetailed = [];
    const votaciones = await this.fetchVotaciones();
    
    for await (const v of votaciones) {
      const detalle = await this.crawlVotacionDetail(v.id);
      votacionesDetailed.push({ ...v, ...detalle });
    }

    return votacionesDetailed;
  }

  async saveJSON() {
    const path = './votaciones.json';
    const data = await this.prepareData();
    fs.writeFileSync(path, JSON.stringify(data))
    console.log(`the data was written to ${path}`)
  }
}

exports.Crawler = Crawler;