import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.json';
import db from '../_helpers/db';

const secret = config.secret;

function authorize(roles: string[] = []) {
    return [
        (req: any, res: Response, next: NextFunction) => {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
            jwt.verify(token, secret, (err: any, user: any) => {
                if (err) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                req.user = user;
                next();
            });
        },
        
        async (req: any, res: Response, next: NextFunction) => {
            const account = await db.Account.findByPk(req.user.id);
            
            if (!account) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
            const isAuthorized = roles.length === 0 || roles.includes(account.role);
            
            if (!isAuthorized) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
            req.user.role = account.role;
            req.user.ownsToken = (token: string) => {
                return true;
            };
            
            next();
        }
    ];
}

export default authorize;