import Head from 'next/head';
import styles from '../styles/Home.module.css';
import {useState} from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div className={styles.container}>
            <Head>
                <title>Counter example</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div>
                <p><Typography variant='h1' data-test-name="counter-title">Count</Typography></p>
                <p style={{textAlign: 'center'}}><Typography data-test-name="count-number" className='test-counter-number' variant='h3'>{count}</Typography></p>

                <p style={{marginTop: '2rem'}}>
                    <Button variant="contained" data-test-name="count-up" color="primary" onClick={() => setCount(count + 1)}>Increment</Button>
                    <Button style={{marginLeft: '1rem'}} data-test-name="count-down" variant="contained" color="secondary" onClick={() => setCount(count - 1)} disabled={count <= 0}>Decrement</Button>
                </p>
            </div>
        </div>
    );
}
