const { v4: uuidv4 } = require('uuid');

class User {
    constructor(db) {
        this.db = db;
    }

    async findByGithubId(githubId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE github_id = ?',
                [githubId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async findById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async create(githubProfile) {
        const user = {
            id: uuidv4(),
            github_id: githubProfile.id,
            username: githubProfile.username,
            display_name: githubProfile.displayName || githubProfile.username,
            email: githubProfile.emails && githubProfile.emails[0] ? githubProfile.emails[0].value : null,
            avatar_url: githubProfile.photos && githubProfile.photos[0] ? githubProfile.photos[0].value : null,
            profile_url: githubProfile.profileUrl,
            created_at: Date.now(),
            updated_at: Date.now()
        };

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO users (id, github_id, username, display_name, email, avatar_url, profile_url, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user.id,
                    user.github_id,
                    user.username,
                    user.display_name,
                    user.email,
                    user.avatar_url,
                    user.profile_url,
                    user.created_at,
                    user.updated_at
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(user);
                }
            );
        });
    }

    async update(id, githubProfile) {
        const updateData = {
            username: githubProfile.username,
            display_name: githubProfile.displayName || githubProfile.username,
            email: githubProfile.emails && githubProfile.emails[0] ? githubProfile.emails[0].value : null,
            avatar_url: githubProfile.photos && githubProfile.photos[0] ? githubProfile.photos[0].value : null,
            profile_url: githubProfile.profileUrl,
            updated_at: Date.now()
        };

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users SET username = ?, display_name = ?, email = ?, avatar_url = ?, profile_url = ?, updated_at = ?
                 WHERE id = ?`,
                [
                    updateData.username,
                    updateData.display_name,
                    updateData.email,
                    updateData.avatar_url,
                    updateData.profile_url,
                    updateData.updated_at,
                    id
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, ...updateData });
                }
            );
        });
    }

    async findOrCreate(githubProfile) {
        const existingUser = await this.findByGithubId(githubProfile.id);
        
        if (existingUser) {
            // Update user with latest GitHub data
            return await this.update(existingUser.id, githubProfile);
        } else {
            // Create new user
            return await this.create(githubProfile);
        }
    }

    async linkAnonymousEndpoints(userId, anonymousUserId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE endpoints SET user_id = ? WHERE user_id = ?',
                [userId, anonymousUserId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getUserEndpoints(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT e.*, COUNT(r.id) as request_count
                 FROM endpoints e
                 LEFT JOIN requests r ON e.id = r.endpoint_id
                 WHERE e.user_id = ?
                 GROUP BY e.id
                 ORDER BY e.created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }
}

module.exports = User;