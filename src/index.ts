import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import { validate as uuidValidate } from 'uuid';
import dotenv from "dotenv";
import "es6-shim";
import express, { Express, Request, Response } from "express";
import { Pool } from "pg";
import "reflect-metadata";
import { Board } from "./dto/board.dto";
import { User } from "./dto/user.dto";
import { Lista} from "./dto/lista.dto";
import { TarjetaDto } from "./dto/tarjeta.dto";
import { UserTarjetaDto } from "./dto/user_tarjeta.dto" ;
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: +process.env.DB_PORT!,
});

const app: Express = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.get("/users", async (req: Request, res: Response) => {
  try {
    const text = "SELECT id, name, email FROM users";
    const result = await pool.query(text);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

app.post("/users", async (req: Request, res: Response) => {
  let userDto: User = plainToClass(User, req.body);
  try {
    await validateOrReject(userDto);

    const text = "INSERT INTO users(name, email) VALUES($1, $2) RETURNING *";
    const values = [userDto.name, userDto.email];
    const result = await pool.query(text, values);
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    return res.status(422).json(errors);
  }
});

app.get("/boards", async (req: Request, res: Response) => {
  try {
    const text =
      'SELECT b.id, b.name, bu.userId "adminUserId" FROM boards b JOIN board_users bu ON bu.boardId = b.id WHERE bu.isAdmin IS true';
    const result = await pool.query(text);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

app.post("/boards", async (req: Request, res: Response) => {
  let boardDto: Board = plainToClass(Board, req.body);
  const client = await pool.connect();
  try {
    client.query("BEGIN");
    await validateOrReject(boardDto, {});

    const boardText = "INSERT INTO boards(name) VALUES($1) RETURNING *";
    const boardValues = [boardDto.name];
    const boardResult = await client.query(boardText, boardValues);

    const boardUserText =
      "INSERT INTO board_users(boardId, userId, isAdmin) VALUES($1, $2, $3)";
    const boardUserValues = [
      boardResult.rows[0].id,
      boardDto.adminUserId,
      true,
    ];
    await client.query(boardUserText, boardUserValues);

    client.query("COMMIT");
    res.status(201).json(boardResult.rows[0]);
  } catch (errors) {
    client.query("ROLLBACK");
    return res.status(422).json(errors);
  } finally {
    client.release();
  }
});
app.get("/listas", async (req: Request, res: Response) => {
  try {
    const Board_Id = req.query.Board_Id as string;
    console.log("Received Board_Id:", Board_Id); // Agrega este registro de depuración

    // Verificar si tarjetaId es un UUID válido antes de realizar la consulta
    if (!uuidValidate(Board_Id)) {
      return res.status(400).json({ error: "Invalid tarjetaId format" });
    }
    const text = "SELECT lista.id, lista.name, lista.board_id FROM lista INNER JOIN boards ON boards.id = lista.board_id WHERE lista.board_id = $1"
    ;
    const result = await pool.query(text,[Board_Id]);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});
app.post("/listas", async (req, res) => {
  let listaDto = plainToClass(Lista, req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validar los datos de la lista
    await validateOrReject(listaDto);

    // Insertar la lista en la tabla 'lista'
    const listaQueryText = "INSERT INTO lista(name, board_id) VALUES($1, $2) RETURNING id";
    const listaValues = [listaDto.name, listaDto.board_id];
    const listaResult = await client.query(listaQueryText, listaValues);
    const listaId = listaResult.rows[0].id;

    // Realizar otras operaciones relacionadas, si es necesario

    await client.query("COMMIT");
    
    res.status(201).json({ id: listaId });
  } catch (errors) {
    await client.query("ROLLBACK");
    res.status(422).json(errors);
  } finally {
    client.release();
  }
});
app.get ("/tarjetas", async (req: Request, res: Response) => {
  try {
    const id_lista = req.query.id_lista as string;
    if (!uuidValidate(id_lista)) {
      return res.status(400).json({ error: "Invalid id_lista format" });
    }

    const text = "SELECT  id, name, id_lista, fecha_tope, description FROM tarjeta WHERE id_lista = $1";
    const result = await pool.query(text, [id_lista]);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});


app.post("/tarjetas", async (req, res) => {
  // Convierte los datos de la solicitud a un objeto de clase TarjetaDto
  let tarjetaDto: TarjetaDto = plainToClass(TarjetaDto, req.body);

  // Obtiene una conexión de la piscina de conexiones de la base de datos
  const client = await pool.connect();

  try {
    // Inicia una transacción
    await client.query("BEGIN");

    // Valida los datos de la tarjeta
    await validateOrReject(tarjetaDto);

    // Realiza la inserción de la tarjeta en la tabla 'tarjeta'
    const tarjetaQueryText = "INSERT INTO tarjeta(name, id_lista, description, fecha_tope) VALUES($1, $2, $3, $4) RETURNING id";
    const tarjetaValues = [tarjetaDto.name, tarjetaDto.id_lista, tarjetaDto.description, tarjetaDto.fecha_tope];
    const tarjetaResult = await client.query(tarjetaQueryText, tarjetaValues);
    const tarjetaId = tarjetaResult.rows[0].id;

    // Confirma la transacción
    await client.query("COMMIT");

    // Envía una respuesta con el resultado de la operación
    res.status(201).json({ id: tarjetaId });
  } catch (errors) {
    // Si ocurre algún error durante la transacción, revierte la transacción
    await client.query("ROLLBACK");
    
    // Envía una respuesta con los errores
    res.status(422).json(errors);
  } finally {
    client.release();
  }
});
app.get("/user_tarjeta", async (req: Request, res: Response) => {
  try {
    // Obtener el valor de tarjetaid de la solicitud
    const tarjetaId = req.query.tarjetaId as string;

    console.log("Received tarjetaId:", tarjetaId); // Agrega este registro de depuración

    // Verificar si tarjetaId es un UUID válido antes de realizar la consulta
    if (!uuidValidate(tarjetaId)) {
      return res.status(400).json({ error: "Invalid tarjetaId format" });
    }

    // Consulta SQL con el parámetro $1 para tarjetaid
    const text = `
      SELECT user_tarjeta.id, user_tarjeta.tarjetaid, user_tarjeta.userid, user_tarjeta.IsOwner
      FROM user_tarjeta
      INNER JOIN users ON user_tarjeta.userid = users.id
      WHERE user_tarjeta.tarjetaid = $1 AND user_tarjeta.IsOwner = true
    `;

    // Ejecutar la consulta SQL con el valor de tarjetaid
    const result = await pool.query(text, [tarjetaId]);

    // Devolver los resultados al cliente
    res.status(200).json(result.rows);
  } catch (error) {
    // Manejar cualquier error y devolver una respuesta de error al cliente
    console.error("Error:", error); // Agrega este registro de depuración
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/user_tarjeta", async (req, res) => {
  let userTarjetaDto: UserTarjetaDto = plainToClass(UserTarjetaDto, req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validar los datos de user_tarjeta
    await validateOrReject(userTarjetaDto);

    // Insertar user_tarjeta en la tabla 'user_tarjeta'
    const userTarjetaText = "INSERT INTO user_tarjeta(IsOwner, tarjetaid, userid) VALUES($1, $2, $3) RETURNING *";
    const userTarjetaValues = [userTarjetaDto.IsOwner, userTarjetaDto.tarjetaid, userTarjetaDto.userid];
    const userTarjetaResult = await client.query(userTarjetaText, userTarjetaValues);

    await client.query("COMMIT");

    res.status(201).json(userTarjetaResult.rows[0]);
  } catch (errors) {
    await client.query("ROLLBACK");
    res.status(422).json(errors);
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
