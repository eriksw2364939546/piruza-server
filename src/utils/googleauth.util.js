import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Верификация Google ID Token
export const verifyGoogleToken = async (idToken) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        return {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
            avatar: payload.picture
        };
    } catch (error) {
        throw new Error('Invalid Google token: ' + error.message);
    }
};