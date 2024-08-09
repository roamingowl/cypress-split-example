import Head from 'next/head';
import styles from '../styles/Home.module.css';
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import {MouseEventHandler, useState} from "react";
import ListItemText from "@mui/material/ListItemText";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from "@mui/material/IconButton";

export default function Itemslist() {
    let [items, setItems] = useState<{name: string}[]>([]);
    let [counter, setCounter] = useState(1);

    const addItem = () => {
        const newItems = [...items, {name: `Item ${counter}`}];
        setItems(newItems);
        setCounter(counter + 1);
    };

    const deleteItem = (index: number) => {
        console.log('delete item', index);
        let newItems = items.filter((item, i) => i !== index);
        setItems(newItems);
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Items list example</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Typography variant="h3" data-test-name="page-title">List of items</Typography>
            <List
                data-test-name="items-list"
                sx={{
                    width: '100%',
                    maxWidth: 360,
                    bgcolor: 'background.paper',
                    position: 'relative',
                    overflow: 'auto',
                    maxHeight: 300,
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    minHeight: 50,
                    '& ul': { padding: 0 },
                }}
                subheader={<li />}
            >
                {items.map((item, index) => (
                    <ListItem key={`item-${index}`} data-test-name={`list-item-${index}`}>
                        <ListItemText primary={`${item.name}`} />
                        <IconButton aria-label="delete" onClick={(e) => deleteItem(index)} size="small">
                            <DeleteIcon />
                        </IconButton>
                    </ListItem>
                ))}
            </List>
            <Typography data-test-name="items-count">Current count: {items.length}</Typography>
            <Button style={{marginTop: '2rem'}} variant="contained" onClick={addItem} data-test-name="add-item-button">Add item</Button>
        </div>
    );
}
