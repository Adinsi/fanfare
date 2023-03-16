const ObjectId = require("mongoose").Types.ObjectId;
const Partition = require("../modeles/partition");

/**Créer un chant de partition */
module.exports.createPartition = async (req, res) => {
  const { posterId, title, auteur, gamme } = req.body;
  /**Vérifiez si le poster id est celle de l'administrateur si noon renvoyer une erreur 404  */

  if (posterId !== process.env.USER)
    return res.status(404).json({ message: `Vous n'étes pas autorisé` });
  /**Envoyer les données dans notre base de donnée */
  const newPartition = new Partition({
    title,
    auteur,
    gamme,
    posterId,
    partition:
      req.file !== null ? `../partition/${req.file?.originalname}` : "",
  });

  try {
    const partition = await newPartition.save();
    return res.status(201).json({ message: "partition crée", partition });
  } catch (error) {
    return res.status(401).json({
      message:
        "Erreur interne du serveur, veuillez réessayez plus tard" + error,
    });
  }
};

/**Récuperer touts les chants */
module.exports.readPartition = async (req, res) => {
  Partition.find((err, docs) => {
    if (!err) res.send(docs);
    else
      return res.status(500).json({
        message:
          "Erreur interne du serveur, vous pouvez pas récuperez les données",
      });
  }).sort({ createdAt: -1 });
};
