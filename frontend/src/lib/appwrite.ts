import { Client, Account, Databases, Storage, Realtime } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://tor.cloud.appwrite.io/v1')
    .setProject('69a35b3b003b3da23a6c');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const realtime = new Realtime(client);

export const APPWRITE_CONFIG = {
    databaseId: '69a35b4c00160d602f54',
    collections: {
        cards: 'cards',
        inventory: 'inventory',
        auctions: 'auctions',
        wishlist: 'wishlist'
    }
};

export default client;
