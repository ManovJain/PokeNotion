const axios = require("axios");
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_KEY });
const pokeArray = [];

async function getPokemon() {
  for (let i =1; i <= 500; i++) {
    await axios
      .get(`https://pokeapi.co/api/v2/pokemon/${i}`)
      .then((poke) => {
        const typesArray = [];

        for (let type of poke.data.types) {
          const typeObj = {
            name: type.type.name,
          };
          typesArray.push(typeObj);
        }

        const processedName = poke.data.species.name
          .split(/-/)
          .map((name) => {
            return name[0].toUpperCase() + name.substring(1);
          })
          .join(" ")
          .replace(/^Mr M/, "Mr. M")
          .replace(/^Mime Jr/, "Mime Jr.")
          .replace(/^Mr R/, "Mr. R")
          .replace(/mo O/, "mo-o")
          .replace(/Porygon Z/, "Porygon-Z")
          .replace(/Type Null/, "Type: Null")
          .replace(/Ho Oh/, "Ho-Oh")
          .replace(/Nidoran F/, "Nidoran♀")
          .replace(/Nidoran M/, "Nidoran♂")
          .replace(/Flabebe/, "Flabébé");

        const bulbURL = `https://bulbapedia.bulbagarden.net/wiki/${processedName.replace(
          " ",
          "_"
        )}_(Pokémon)`;

        const sprite = !poke.data.sprites.front_default
          ? poke.data.sprites.other["official-artwork"].front_default
          : poke.data.sprites.front_default;

        const pokeData = {
          name: processedName,
          number: poke.data.id,
          types: typesArray,
          hp: poke.data.stats[0].base_stat,
          height: poke.data.height,
          weight: poke.data.weight,
          attack: poke.data.stats[1].base_stat,
          defense: poke.data.stats[2].base_stat,
          "special-attack": poke.data.stats[3].base_stat,
          "special-defense": poke.data.stats[4].base_stat,
          speed: poke.data.stats[5].base_stat,
          sprite: sprite,
          artwork: poke.data.sprites.other["official-artwork"].front_default,
          bulbURL: bulbURL,
        };

        pokeArray.push(pokeData);
        console.log(`Fetching ${pokeData.name} from PokeAPI.`);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  for (let pokemon of pokeArray) {
    const flavor = await axios
      .get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.number}`)
      .then((flavor) => {
        pokemon["flavor-text"] = flavor.data.flavor_text_entries
          .find(({ language: { name } }) => name === "en")
          .flavor_text.replace(/\n|\r|\f/g, " ");
        pokemon.category = flavor.data.genera.find(
          ({ language: { name } }) => name === "en"
        ).genus;
        pokemon.generation = flavor.data.generation.name
          .split(/-/)
          .pop()
          .toUpperCase();
      });
  }

  createNotionPage();
}

getPokemon();

async function createNotionPage() {
  for (let pokemon of pokeArray) {
    console.log("sending data to notion");
    const response = await notion.pages.create({
      parent: {
        type: "database_id",
        database_id: process.env.NOTION_DATABASE_ID,
      },
      cover: {
        type: "external",
        external: {
          url: pokemon.artwork,
        },
      },
      icon: {
        type: "external",
        external: {
          url: pokemon.sprite,
        },
      },
      properties: {
        Name: {
          title: [
            {
              type: "text",
              text: {
                content: pokemon.name,
              },
            },
          ],
        },
        No: {
          number: pokemon.number,
        },
        Type: { multi_select: pokemon.types },
        Sprite: {
          files: [
            {
              type: "external",
              name: "Pokemon Sprite",
              external: {
                url: pokemon.sprite,
              },
            },
          ],
        },
        Generation: {
          select: {
            name: pokemon.generation,
          },
        },
        Category: {
          rich_text: [
            {
              type: "text",
              text: {
                content: pokemon.category,
              },
            },
          ],
        },
        HP: { number: pokemon.hp },
        Attack: { number: pokemon.attack },
        Defense: { number: pokemon.defense },
        "Sp. Attack": { number: pokemon["special-attack"] },
        "Sp. Defense": { number: pokemon["special-defense"] },
        Speed: { number: pokemon.speed },
        Height: { number: pokemon.height },
        Weight: { number: pokemon.weight },
      },
      children: [
        {
          "object": "block",
          "type": "quote",
          "quote": {
            "rich_text": [
              {
                "type": "text",
                "text": {
                  "content": pokemon['flavor-text']
                }
              }
            ]
          }
        },
        {
          "object": "block",
          "type": "paragraph",
          "paragraph": {
            "rich_text": [
              {
                "type": "text",
                "text": {
                  "content": ""
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bookmark",
          bookmark: {
            url: pokemon.bulbURL,
          },
        },
      ],
    });

    console.log(response);
  }
}
