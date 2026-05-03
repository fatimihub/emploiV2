const { Administrator } = require('../../models')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

const updateInfo = async (req, res) => {
    const { id, name, email } = req.body

    if (!id || !name || !email) {
        return res.json({ "errors": 'name and email is required!' })
    }

    try {
        const administrator = await Administrator.update(
            {
                name: name,
                email: email
            }, {
            where: {
                id: id,
            }
        })

        const administratorInfo = await Administrator.findOne({
            where: { id },
            attributes: ['id', 'name', 'email', 'profileImage', 'dashboardBackground']
        })

        return res.json({ "administrator": administratorInfo })

    } catch (err) {
        console.log(err)
        return res.status(400).json({ 'errors': 'Error ' + err })
    }
}

const updatePassword = async (req, res) => {
    const { email, password, newPassword, confiremationPassword } = req.body
    if (!email || !password || !newPassword || !confiremationPassword) {
        return res.status(422).json({ "errors": 'the fields password , newPassword and confiremationPassword is required!' })
    }

    try {
        console.log('log', password)

        if (newPassword != confiremationPassword) {
            return res.status(400).json({ "errors": 'should be new password same confiremation password!' })
        }

        const administrator = await Administrator.findOne({ where: { "email": email } })
        console.log('log 2 ', administrator?.password)

        const isPasswordValid = await bcrypt.compare(password, administrator.password)

        if (!isPasswordValid) {
            return res.status(400).json({ 'errors': "password not correct!" })
        }

        const hashPassword = await bcrypt.hash(password, 10)

        console.log('password : ', hashPassword)
        await Administrator.update(
            {
                password: hashPassword
            }, {
            where: {
                email: email,
            }
        })


        return res.json({ "message": "succès modifier password " })

    } catch (err) {
        console.log(err)
        return res.status(400).json({ 'errors': 'Error ' + err })
    }
}


const deleteAccount = async (req, res) => {
    const { email } = req.params

    try {
        if (!email) {
            return res.status(422).json({ "errors": 'email is required !' })
        }

        const admin = await Administrator.findOne({ where: { email } });
        if (admin && admin.profileImage) {
            const avatarPath = path.join(__dirname, '../../uploads/admin-images', admin.profileImage);
            try {
                if (fs.existsSync(avatarPath)) {
                    fs.unlinkSync(avatarPath);
                }
            } catch (err) {
                console.error('Failed to delete avatar on account deletion:', err);
            }
        }

        await Administrator.destroy({
            where: {
                email: email
            }
        })

        res.json({ "message": 'successfuly deleted account !' })

    } catch (err) {
        console.log(err)

    }
}

// Count administrators
const countAdministrators = async (req, res) => {
    try {
        const count = await Administrator.count();
        res.json({ count });
    } catch (error) {
        console.error('Error counting administrators:', error);
        res.status(500).json({ error: 'Failed to count administrators' });
    }
};

const updateAvatar = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ errors: 'Email is required to update avatar.' });
        }

        if (!req.file) {
            return res.status(400).json({ errors: 'No image file uploaded.' });
        }

        const admin = await Administrator.findOne({ where: { email } });
        if (!admin) {
            return res.status(404).json({ errors: 'Administrator not found.' });
        }

        // The image was successfully saved to disk by standard multer, we just save the filename
        const filename = req.file.filename;

        // Cleanup: remove the old avatar if it exists
        if (admin.profileImage) {
            const oldAvatarPath = path.join(__dirname, '../../uploads/admin-images', admin.profileImage);
            try {
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            } catch (err) {
                console.error('Failed to delete old avatar:', err);
                // Continue anyway, we don't want to block the update because of a disk error
            }
        }

        await Administrator.update(
            { profileImage: filename },
            { where: { email } }
        );

        // Return updated admin profile representation
        const updatedAdmin = await Administrator.findOne({
            where: { email },
            attributes: ['id', 'name', 'email', 'profileImage', 'dashboardBackground']
        });

        return res.json({
            message: "Avatar mis à jour avec succès",
            administrator: updatedAdmin
        });

    } catch (err) {
        console.error('Error updating avatar:', err);
        return res.status(500).json({ errors: 'Error updating avatar: ' + err.message });
    }
};

module.exports = { updateInfo, updatePassword, deleteAccount, countAdministrators, updateAvatar };