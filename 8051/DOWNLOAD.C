#include <dos.h>
#include <time.h>
#include <conio.h>
#include <stdio.h>
#include <process.h>

int com_port=0;

void RS232_initial(void)
{
 outportb( 0x3fb-(0x100*com_port) ,0x80 );
 delay(1);
 outportb( 0x3f8-(0x100*com_port),0x18 );//Baud 4800
 delay(1);
 outportb( 0x3f9-(0x100*com_port),0x00 );
 delay(1);
 outportb( 0x3fb-(0x100*com_port),0x03 );// 8 Bits, No Parity, 1 Stop Bit
 delay(1);

}

void RS232_send_data(int data)
{
 int ready;
 time_t time1,time2;

 time1 = time(NULL);

 do {
   ready=inportb(0x3fd-(0x100*com_port)) & 0x20;

   time2=time(NULL);
   if( difftime( time2,time1 ) >2 )
     {
      printf("\nRS232 time out error !\n");
      exit(1);
     }

  } while (ready != 0x20 );

 outportb( 0x3f8-(0x100*com_port),data );

}

int RS232_send_ready(void)
{
 int ready;

 ready=inportb(0x3fd-(0x100*com_port)) & 0x20;

 return( (ready== 0x20) ? 1 : 0 );
}


void RS232_receive_data( int *data )
{
 int ready;
 time_t time1,time2;

 time1=time(NULL);

 do {
   ready=inportb(0x3fd-(0x100*com_port)) & 0x01 ;

   time2=time(NULL);
   if( difftime( time2,time1) > 2 )
     {
      printf("\nRS232 time out error!\n");
      exit(1);
     }

   } while( ready != 0x01 );

 *data=(int)inportb(0x3f8-(0x100*com_port));
}


int RS232_receive_ready(void)
{
 int ready;

 ready=inportb(0x3fd-(0x100*com_port)) & 0x01;

 return( (ready == 0x01) ? 1 : 0 );
}


void download_program(char *filename)
{
 FILE *in;
 int  k,file_pos;
 long curpos , length;
 int  hi_byte,lo_byte;

 in=fopen( filename , "rb" );

 if( in==NULL )
  {
   printf( "File can't open sucessfully !\n");
   return;
  }


                                    /* get length of file */
 fseek( in , 0L , SEEK_END );
 length= ftell(in);
 fseek( in , 0L , SEEK_SET );


 printf( "\nDownload File %s .........", filename );
 printf( "length = 0x%X (#=10bytes)  through  COM%d \n",(int)(length), com_port+1 );


 hi_byte= (int)(length / 256L);
 lo_byte= (int)(length % 256L);

 file_pos=0;


 RS232_send_data( 'P' );             /* Tell 8051 this is download process */
 delay(2);
 RS232_send_data( hi_byte );
 delay(2);
 RS232_send_data( lo_byte );
 delay(2);

 k=fgetc(in);

 while( k!=EOF )
   {
    RS232_send_data( k );
    delay(2);
    RS232_receive_data( &k) ;
    delay(2);

    if( k!='Z' )
       printf( "transmit error %d!  ",k );

    k=fgetc(in);
    file_pos++;
    if( (file_pos % 10 ) == 0)
        printf("#");
   }

 fclose(in);
}



void main(char argn,char **argv)
{
 int k,data;

 if( argn==1 )
  {
   printf( "Usage  : download <program.tsk> <comport>\n");
   printf( "Example: downlaod fax51p.tsk 1\n");
   return;
  }

 com_port=0;

 if(argn==3)
  {
   if( argv[2][0]=='2' )    // 0--> com1:
      com_port=1;           // 1--> com2;
    else
      com_port=0;
  }


 RS232_initial();
 download_program(argv[1]);

}




